document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) {
        lucide.createIcons();
    }

    const progressBar = document.querySelector('.progress-bar-fill');
    const percentageText = document.querySelector('.progress-percentage');

    if (progressBar && percentageText) {
        const targetWidthStr = progressBar.getAttribute('data-width');
        const targetNumber = parseInt(targetWidthStr);

        setTimeout(() => {
            progressBar.style.width = targetWidthStr;
        }, 300);

        let currentNumber = 0;
        const duration = 1500;
        const intervalTime = 20;
        const step = (targetNumber / duration) * intervalTime;

        const counter = setInterval(() => {
            currentNumber += step;
            
            if (currentNumber >= targetNumber) {
                currentNumber = targetNumber;
                clearInterval(counter);
            }
            
            percentageText.textContent = Math.round(currentNumber) + '%';
        }, intervalTime);
    }
});