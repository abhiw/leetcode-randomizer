function createTimerElement() {
    const timerDiv = document.createElement('div');
    timerDiv.id = 'leetcode-timer';
    timerDiv.className = 'leetcode-timer';
    document.body.appendChild(timerDiv);
  
    // Make timer draggable
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
  
    timerDiv.addEventListener('mousedown', startDragging);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDragging);
  
    function startDragging(e) {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      isDragging = true;
    }
  
    function drag(e) {
      if (!isDragging) return;
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      xOffset = currentX;
      yOffset = currentY;
      timerDiv.style.transform = `translate(${currentX}px, ${currentY}px)`;
    }
  
    function stopDragging() {
      isDragging = false;
    }
  
    // Timer update logic
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'UPDATE_TIMER') {
        const minutes = Math.floor(message.timeLeft / 60);
        const seconds = message.timeLeft % 60;
        timerDiv.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    });
  }
  
  createTimerElement();