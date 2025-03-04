document.addEventListener('DOMContentLoaded', function() {
    const connectBtn = document.getElementById('connectBtn');
    const phoneNumberInput = document.getElementById('phoneNumber');
    const resultContainer = document.getElementById('resultContainer');
    const pairingCodeElement = document.getElementById('pairingCode');
    const errorContainer = document.getElementById('errorContainer');
    const errorMessageElement = document.getElementById('errorMessage');
    const loader = document.getElementById('loader');
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');

    connectBtn.addEventListener('click', async function() {
        const phoneNumber = phoneNumberInput.value.trim();

        // Validate phone number
        if (!phoneNumber || !/^\d+$/.test(phoneNumber) || phoneNumber.length < 10) {
            showError('Please enter a valid phone number including country code (e.g., 94773010580)');
            return;
        }

        // Reset UI elements
        resetUI();

        // Show loader
        connectBtn.disabled = true;
        loader.classList.remove('hidden');

        try {
            // Make API request
            const response = await fetch('/api/get-pairing-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phoneNumber }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Show pairing code
                pairingCodeElement.textContent = data.pairingCode;
                resultContainer.classList.remove('hidden');

                // Set up polling for connection status
                checkConnectionStatus();
            } else {
                console.error('Error response:', data);
                let errorMsg = data.message || 'An error occurred while generating the pairing code';
                
                // Provide more helpful messages for common errors
                if (errorMsg.includes('Connection Closed')) {
                    errorMsg = 'WhatsApp connection closed. This might be due to network issues or WhatsApp server limitations. Please try again in a few minutes.';
                }
                
                showError(errorMsg);
                
                // Add retry button functionality
                const retryButton = document.createElement('button');
                retryButton.textContent = 'Try Again';
                retryButton.className = 'connect-btn';
                retryButton.style.marginTop = '15px';
                retryButton.onclick = function() {
                    errorContainer.classList.add('hidden');
                    errorContainer.removeChild(retryButton);
                };
                errorContainer.appendChild(retryButton);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            showError('Network error. Please try again.');
        } finally {
            // Hide loader
            loader.classList.add('hidden');
            connectBtn.disabled = false;
        }
    });

    // Function to check connection status (simulated)
    function checkConnectionStatus() {
        let attempts = 0;
        const maxAttempts = 30; // 5 minutes (10 seconds * 30)

        const statusCheck = setInterval(() => {
            attempts++;

            // This is a simulated check - in a real app you'd check with the server
            if (attempts >= maxAttempts) {
                statusIcon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
                statusIcon.className = 'status-icon error';
                statusText.textContent = 'Connection timed out. Please try again.';
                clearInterval(statusCheck);
            }
        }, 10000); // Check every 10 seconds

        // For demo purposes, let's also add listeners for Enter key press to simulate success
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !resultContainer.classList.contains('hidden')) {
                statusIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
                statusIcon.className = 'status-icon success';
                statusText.textContent = 'Successfully connected!';
                clearInterval(statusCheck);
            }
        });
    }

    function showError(message) {
        errorMessageElement.textContent = message;
        errorContainer.classList.remove('hidden');
    }

    function resetUI() {
        errorContainer.classList.add('hidden');
        resultContainer.classList.add('hidden');
        statusIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        statusIcon.className = 'status-icon pending';
        statusText.textContent = 'Waiting for connection...';
    }
});