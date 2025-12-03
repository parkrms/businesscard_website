// ... (이전 코드와 동일, setup, draw 등) ...

// --- [수정] 상세 모드 진입 ---
function triggerDetailMode(card) {
  appMode = 'DETAIL';
  isHolding = false;
  focusedCard = card;
  
  // 버그 수정: 드래그 상태 강제 해제
  card.stopDrag(); 
  card.isDragging = false; 
  currentCard = null; 

  // 레이어 활성화
  document.getElementById('detail-layer').classList.add('active');
  
  // [NEW] 닫기 버튼 보이기
  document.getElementById('global-close-btn').classList.add('visible');
}

// --- [수정] 상세 모드 종료 ---
window.closeDetail = function() {
  let layer = document.getElementById('detail-layer');
  layer.classList.remove('active');
  
  // [NEW] 닫기 버튼 숨기기
  document.getElementById('global-close-btn').classList.remove('visible');
  
  setTimeout(() => {
    appMode = 'NORMAL';
    if (focusedCard) {
      focusedCard = null;
    }
  }, 400); 
};

// ... (나머지 터치 이벤트 등 동일) ...
