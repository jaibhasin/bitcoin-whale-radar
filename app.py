from flask import Flask, render_template, jsonify
import requests
from datetime import datetime, timedelta
import time
import cachetools.func
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

def format_number(number, format_type='regular'):
    """Format numbers for display"""
    try:
        if format_type == 'price':
            return f"{float(number):,.2f}"
        elif format_type == 'value':
            number = float(number)
            if number >= 1_000_000_000:
                return f"${number / 1_000_000_000:.2f}B"
            elif number >= 1_000_000:
                return f"${number / 1_000_000:.2f}M"
            elif number >= 1_000:
                return f"${number / 1_000:.2f}K"
            return f"${number:.2f}"
        else:  # regular format for BTC
            return f"{float(number):,.8f}"
    except (ValueError, TypeError) as e:
        logger.error(f"Error formatting number {number}: {e}")
        return "0.00"

# Cache BTC price for 30 seconds
@cachetools.func.ttl_cache(ttl=30)
def get_btc_price():
    """Get current Bitcoin price in USD"""
    try:
        response = requests.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', timeout=5)
        if response.status_code == 200:
            data = response.json()
            logger.info(f"BTC Price fetched successfully")
            return float(data['price'])
        else:
            logger.error(f"BTC Price API Error: Status code {response.status_code}")
    except Exception as e:
        logger.error(f"Error fetching BTC price: {e}")
    return 65000  # Default fallback price

# Cache historical volume data for 1 hour
@cachetools.func.ttl_cache(ttl=3600)
def get_historical_volume():
    """Get historical Bitcoin transaction volume data"""
    try:
        # First try CoinGecko API which tends to be reliable
        url = (
            "https://api.coingecko.com/api/v3/coins/bitcoin/"
            "market_chart?vs_currency=usd&days=730&interval=daily"
        )
        response = requests.get(url, timeout=10)

        if response.status_code == 200:
            data = response.json()
            logger.info("Historical volume data fetched from CoinGecko")
            volumes = data.get("total_volumes", [])
            return [
                {"x": int(point[0] / 1000), "y": point[1]}
                for point in volumes
            ]

        # If CoinGecko fails, try the old blockchain.info endpoint
        logger.warning(
            f"CoinGecko API Error: Status code {response.status_code}, trying blockchain.info"
        )
        url = (
            "https://api.blockchain.info/charts/estimated-transaction-volume-usd?timespan=2years&format=json&cors=true"
        )
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            logger.info("Historical volume data fetched from blockchain.info")
            return data.get("values", [])

        logger.error(
            f"Historical Volume API Error: Status code {response.status_code}"
        )
    except Exception as e:
        logger.error(f"Error fetching historical volume data: {e}")
    return []


# Cache rich list data for 5 minutes
@cachetools.func.ttl_cache(ttl=300)
def get_rich_list():
    """Get top 10 richest Bitcoin addresses"""
    try:
        url = "https://api.blockchair.com/bitcoin/addresses?limit=10&s=balance(desc)"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json().get("data", [])
            rich_list = []
            current_price = get_btc_price()

            for entry in data:
                address = entry.get("address")
                balance_btc = entry.get("balance", 0) / 100000000
                rich_list.append({
                    "address": address,
                    "balance_btc": format_number(balance_btc, "regular"),
                    "balance_usd": format_number(balance_btc * current_price, "value"),
                    "type": get_wallet_label(address),
                })

            logger.info(
                f"Rich list generated successfully with {len(rich_list)} addresses"
            )
            return rich_list
        logger.error(f"Blockchair API Error: Status code {response.status_code}")
    except Exception as e:
        logger.error(f"Error in get_rich_list: {e}")
    return []

def get_wallet_label(address):
    """Get label for known wallet addresses"""
    labels = {
        "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo": "Binance Cold Wallet",
        "bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq4nw842ns4vw0eh": "Bitfinex Cold Wallet",
        "1P5ZEDWTKTFGxQjZphgWPQUpe554WKDfHQ": "Huobi Cold Wallet",
        "3LQUu4v9z6KNch71j7kbj8GPeAGUo1FW6a": "Binance Hot Wallet",
        "bc1qa5wkgaew2dkv56kfvj49j0av5nml45x9ek9hz6": "Unknown Whale",
        "1LQoWist8KkaUXSPKZHNvEyfrEkPHzSsCd": "Huobi Cold Wallet 2",
        "3Kzh9qAqVWQhEsfQz7zEQL1EuSx5tyNLNS": "OKX Cold Wallet",
        "1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s": "Binance Cold Wallet 2",
        "38UmuUqPCrFmQo4khkomQwZ4VbY2nZMJ67": "Kraken",
        "1FeexV6bAHb8ybZjqQMjJrcCrHGW9sb6uF": "Unknown Whale"
    }
    return labels.get(address, "Unknown Wallet")

def get_large_transactions():
    """Get data for large Bitcoin transactions in the last 24 hours"""
    try:
        current_price = get_btc_price()
        
        # Calculate timestamp for 24 hours ago
        twenty_four_hours_ago = int((datetime.now() - timedelta(hours=24)).timestamp())
        
        data = {
            "current_btc_price": format_number(current_price, 'price'),
            "transactions": [],
            "rich_list": get_rich_list(),
            "historical_volume": get_historical_volume()
        }
        
        try:
            # Get recent blocks from the last 24 hours
            url = f"https://blockchain.info/blocks/{twenty_four_hours_ago}000?format=json"
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                blocks = response.json()
                
                # Process each block to find large transactions
                for block in blocks[:5]:  # Limit to 5 blocks to avoid too many requests
                    block_url = f"https://blockchain.info/rawblock/{block['hash']}"
                    block_response = requests.get(block_url, timeout=5)
                    
                    if block_response.status_code == 200:
                        block_data = block_response.json()
                        
                        for tx in block_data.get('tx', []):
                            # Calculate total output value
                            output_value = sum(out.get('value', 0) for out in tx.get('out', []))
                            amount_btc = output_value / 100000000  # Convert satoshis to BTC
                            
                            if amount_btc > 100:  # Only transactions > 100 BTC
                                data['transactions'].append({
                                    'hash': tx['hash'],
                                    'amount_btc': format_number(amount_btc, 'regular'),
                                    'amount_usd': format_number(amount_btc * current_price, 'value'),
                                    'time': datetime.fromtimestamp(tx.get('time', 0)).strftime('%Y-%m-%d %H:%M:%S'),
                                    'inputs': len(tx.get('inputs', [])),
                                    'outputs': len(tx.get('out', []))
                                })
                    
                    time.sleep(0.2)  # Small delay between requests
                
                # Sort transactions by amount and get top 10
                data['transactions'] = sorted(
                    data['transactions'],
                    key=lambda x: float(x['amount_btc'].replace(',', '')),
                    reverse=True
                )[:10]
                
                logger.info(f"Fetched {len(data['transactions'])} large transactions")
            else:
                logger.error(f"Blockchain.info API Error: Status code {response.status_code}")
        
        except Exception as e:
            logger.error(f"Error fetching large transactions: {e}")
        
        # If no transactions found, try to get from mempool
        if not data['transactions']:
            try:
                url = "https://blockchain.info/unconfirmed-transactions?format=json"
                response = requests.get(url, timeout=5)
                
                if response.status_code == 200:
                    tx_data = response.json()
                    
                    for tx in tx_data.get('txs', []):
                        total_output = sum(out['value'] for out in tx['out']) / 100000000
                        
                        if total_output > 50:  # Only transactions > 50 BTC
                            data['transactions'].append({
                                'hash': tx['hash'],
                                'amount_btc': format_number(total_output, 'regular'),
                                'amount_usd': format_number(total_output * current_price, 'value'),
                                'time': datetime.fromtimestamp(tx.get('time', 0)).strftime('%Y-%m-%d %H:%M:%S'),
                                'inputs': len(tx.get('inputs', [])),
                                'outputs': len(tx.get('out', []))
                            })
                    
                    # Sort transactions by amount and get top 10
                    data['transactions'] = sorted(
                        data['transactions'],
                        key=lambda x: float(x['amount_btc'].replace(',', '')),
                        reverse=True
                    )[:10]
                    
                    logger.info(f"Fetched {len(data['transactions'])} unconfirmed transactions")
            except Exception as e:
                logger.error(f"Error fetching unconfirmed transactions: {e}")
        
        return data
    
    except Exception as e:
        logger.error(f"Error in get_large_transactions: {e}")
        return {
            "current_btc_price": format_number(get_btc_price(), 'price'),
            "transactions": [],
            "rich_list": get_rich_list(),
            "historical_volume": get_historical_volume()
        }

@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html')

@app.route('/api/data')
def get_data():
    """API endpoint to get Bitcoin data"""
    return jsonify(get_large_transactions())

if __name__ == '__main__':
    app.run(debug=True)
