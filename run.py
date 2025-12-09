"""
Flask Application Runner

This script initializes and runs the Serenotes Flask application.
It supports both local development and production deployments.
"""

import os
import logging
from app import create_app

# Configure logging for better debugging and monitoring
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """
    Main entry point for running the Flask application.
    
    Handles configuration through environment variables for flexibility
    across different deployment environments.
    """
    try:
        # Create the Flask application instance
        logger.info("Initializing Flask application...")
        app = create_app()
        
        # Configuration from environment variables with sensible defaults
        host = os.getenv('HOST', '127.0.0.1')  # Default to localhost for security
        port = int(os.getenv('PORT', 5000))   # Default port 5000
        debug = os.getenv('DEBUG', 'True').lower() in ('true', '1', 'yes')
        
        # Validate port range
        if not (1024 <= port <= 65535):
            raise ValueError(f"Invalid port number: {port}. Must be between 1024 and 65535.")
        
        logger.info(f"Starting server on {host}:{port} (debug={debug})")
        
        # Run the application with proper configuration
        app.run(
            host=host,
            port=port,
            debug=debug,
            threaded=True  # Enable threading for better concurrency in development
        )
        
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        exit(1)
    except ImportError as e:
        logger.error(f"Import error: {e}. Make sure all dependencies are installed.")
        exit(1)
    except Exception as e:
        logger.error(f"Unexpected error during application startup: {e}")
        exit(1)

if __name__ == "__main__":
    main()