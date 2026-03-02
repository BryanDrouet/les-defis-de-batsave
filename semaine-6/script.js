document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) {
        lucide.createIcons();
    }

    const progressBar = document.querySelector('.progress-bar-fill');
    const percentageText = document.querySelector('.progress-percentage');

    let counterInterval = null;

    function updateProgress() {
        if (!progressBar || !percentageText) return;

        const targetWidthStr = progressBar.getAttribute('data-width') || "0%";
        const targetNumber = parseInt(targetWidthStr);

        const currentText = percentageText.textContent.replace('%', '');
        let startNumber = parseInt(currentText) || 0;

        progressBar.style.width = targetWidthStr;

        if (counterInterval) clearInterval(counterInterval);

        const duration = 1500;
        const intervalTime = 20;
        const totalSteps = duration / intervalTime;
        const stepValue = (targetNumber - startNumber) / totalSteps;
        
        let currentStep = 0;

        counterInterval = setInterval(() => {
            currentStep++;
            let newNumber = startNumber + (stepValue * currentStep);

            if ((stepValue > 0 && newNumber >= targetNumber) || (stepValue < 0 && newNumber <= targetNumber)) {
                newNumber = targetNumber;
                clearInterval(counterInterval);
            }

            percentageText.textContent = Math.round(newNumber) + '%';
        }, intervalTime);
    }

    setTimeout(updateProgress, 300);

    if (progressBar) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-width') {
                    updateProgress();
                }
            });
        });

        observer.observe(progressBar, { attributes: true });
    }
});