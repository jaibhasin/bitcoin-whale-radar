# CryptoWhale Radar - Bitcoin Tracking Website

A modern, responsive web application that tracks Bitcoin data, including the latest price, largest transactions, top wallets, and historical transaction volume.

![CryptoWhale Radar Screenshot1](assets/ss1.png)  
![CryptoWhale Radar Screenshot2](assets/ss2.png)  

## Features

- **Real-time Bitcoin Price**: Displays the current Bitcoin price in USD
- **Largest Transactions**: Shows the top 10 Bitcoin transactions from the last 24 hours
- **Top Bitcoin Wallets**: Lists the top 10 richest Bitcoin wallets in the world
- **Historical Volume Chart**: Visualizes the volume of Bitcoin transactions over time
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Theme**: Modern dark UI for comfortable viewing

## Technologies Used

- **Backend**: Flask (Python)
- **Frontend**: HTML5, CSS3, JavaScript
- **Charts**: Chart.js with date-fns adapter
- **Styling**: Bootstrap 5 and custom CSS
- **Icons**: Font Awesome
- **APIs**: Blockchain.info, Binance, and other public APIs

## Setup and Installation

1. Clone the repository:
   ```
   git clone <https://github.com/jaibhasin/bitcoin-whale-radar>
   cd bitcoin-whale-radar
   ```

2. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Run the application:
   ```
   python app.py
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

## API Endpoints

- `/api/data`: Returns Bitcoin price, largest transactions, rich list, and historical volume data

## Project Structure

- `app.py`: Main Flask application with API endpoints and data processing logic
- `templates/index.html`: Main HTML template for the website
- `static/css/style.css`: Custom CSS styles
- `static/js/main.js`: JavaScript for data fetching and chart rendering

## Data Sources

- Current Bitcoin price: Binance API
- Transaction data: Blockchain.info API
- Rich list data: Blockchain.info API
- Historical volume data: Blockchain.info charts API

## Caching

The application implements caching to reduce API calls and improve performance:
- Bitcoin price: 30 seconds
- Historical volume data: 1 hour
- Rich list data: 5 minutes

## 🚀 Contributing  
Contributions are welcome! Feel free to fork this repository and submit a pull request.  

If you have any suggestions or improvements, open an issue or create a pull request.  

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgements

- Blockchain.info for providing public APIs
- Chart.js for the charting library
- Bootstrap for the responsive framework
