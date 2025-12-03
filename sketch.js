// ==========================================
// 1. 전역 변수 및 설정
// ==========================================
let cardFrontImage;
let shadowTexture; // 고퀄리티 그림자 텍스처
let cards = [];
let numCards = 10;
let cardW, cardH; 

// 파스텔톤 뒷면 색상 팔레트
let backColorsHex = [
  "#FFB4B4", "#FFDCB4", "#FFFFB4", "#DCFFB4", "#B4FFB4",
  "#B4FFDC", "#B4FFFF", "#B4DCFF", "#B4B4FF", "#DCB4FF"
];
let backColors = [];

// 인터랙션 상태 변수
let currentCard = null; // 드래그 중인 카드
let focusedCard = null; // 상세보기에 들어간 카드
let pressStartTime;

// 물리/인터랙션 설정
let mouseSpeedThreshold = 360.0; // 흔들기 감도
let shakeRadius; // 흔들기 감지 범위 (화면 크기에 비례)

// 모바일 감지
let isMobileDevice = false;

// 타이머 변수
let lastReleaseTime = 0;
let lastShakeTime = 0;
let holdStartTime = 0;
let isHolding = false;
let holdDuration = 1500; // 롱프레스 기준 시간 (초기값)

// 앱 모드 ('NORMAL' = 일반, 'DETAIL' = 상세화면)
let appMode = 'NORMAL'; 


// ==========================================
// 2. 초기화 (Preload & Setup)
// ==========================================
function preload() {
  try {
    cardFrontImage = loadImage("Asset 2.png");
  } catch (e) {
    console.error("이미지 로드 실패", e);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  noStroke();
  
  // 모바일 여부 정밀 체크
  isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || windowWidth < 800;

  // 디바이스별 설정 조정
  if (isMobileDevice) {
    holdDuration = 1000; // 모바일은 1초만 눌러도 반응
    setShakeThreshold(30); // 모바일 흔들기 민감도
  } else {
    holdDuration = 1500; // PC는 1.5초
  }

  calculateCardDimensions();
  
  // [고퀄리티 그림자 텍스처 생성]
  // 매 프레임 계산하지 않고 미리 그려둔 이미지를 사용하여 성능 최적화
  let shadowTextureWidth = cardW * 1.5; 
  let shadowTextureHeight = cardH * 1.5; 
  
  shadowTexture = createGraphics(shadowTextureWidth, shadowTextureHeight);
  shadowTexture.noStroke();
  shadowTexture.rectMode(CENTER); 
  
  // 가우시안 블러 효과를 흉내낸 그라데이션 사각형 그리기
  for(let i = 40; i > 0; i -= 1) { 
    let alpha = map(i, 40, 0, 0, 200); 
    alpha = pow(alpha / 200, 2.0) * 200; // 부드러운 감쇠 곡선
    shadowTexture.fill(0, 0, 0, alpha);
    
    let currentW = shadowTextureWidth * (i / 40);
    let currentH = shadowTextureHeight * (i / 40);
    // 모서리가 둥근 사각형 그림자
    shadowTexture.rect(shadowTexture.width/2, shadowTexture.height/2, currentW, currentH, 20); 
  }

  // 색상 변환
  for (let hex of backColorsHex) {
    backColors.push(color(hex));
  }

  // 명함 객체 생성 및 배치
  for (let i = 0; i < numCards; i++) {
    // 화면 중앙에 너무 뭉치지 않게, 적절한 범위 내 랜덤 배치
    let safeMarginX = cardW * 0.6; 
    let safeMarginY = cardH * 0.6;
    
    let rX = random(-width/2 + safeMarginX, width/2 - safeMarginX);
    let rY = random(-height/2 + safeMarginY, height/2 - safeMarginY);
    let rAngle = random(TWO_PI);
    cards.push(new BusinessCard(rX, rY, rAngle, backColors[i % backColors.length]));
  }
}

// 화면 크기에 따른 명함 크기 재계산 (반응형)
function calculateCardDimensions() {
  // PC: 화면의 25%, 모바일: 화면의 55% 크기
  let ratio = isMobileDevice ? 0.55 : 0.25;
  
  // 너무 작거나 커지지 않게 제한
  cardW = constrain(windowWidth * ratio, 200, 500); 
  cardH = cardW * (50 / 90); // 명함 비율 유지
  shakeRadius = cardW * 0.8; // 흔들기 감지 범위
}


// ==========================================
// 3. 메인 렌더링 루프 (Draw)
// ==========================================
function draw() {
  background(51); // 배경색 (다크 그레이)
  lights(); // 3D 조명
  
  // 1. 롱프레스(Long Press) 감지 로직
  if (appMode === 'NORMAL' && isHolding && currentCard) {
    // 카드가 뒷면(뒤집힌 상태)일 때만 상세화면 진입 가능
    if (abs(currentCard.flipAngle - PI) < 0.2) {
      if (millis() - holdStartTime > holdDuration) {
        triggerDetailMode(currentCard);
      }
    } else {
      isHolding = false; // 앞면이면 롱프레스 취소
    }
  }

  // 2. 카드 그리기 - Step A: 정지해 있는 카드들
  for (let i = 0; i < cards.length; i++) {
    let c = cards[i];
    if (c === focusedCard) continue; // 상세보기에 들어간 카드는 그리지 않음
    
    // 드래그 중이거나 뒤집히는 중이 아닌 카드만 먼저 그림
    if (!c.isDragging && !c.isFlipping) {
      push();
      translate(0, 0, i * 1); // Z-Fighting 방지용 미세한 높이 차이
      c.update();
      c.display();
      pop();
    }
  }

  // Depth Buffer 지우기 (움직이는 카드를 무조건 맨 위에 그리기 위함)
  drawingContext.clear(drawingContext.DEPTH_BUFFER_BIT);

  // 3. 카드 그리기 - Step B: 움직이는 카드들 (항상 위에 보임)
  for (let i = 0; i < cards.length; i++) {
    let c = cards[i];
    if (c === focusedCard) continue;

    if (c.isDragging || c.isFlipping) {
      push();
      translate(0, 0, 10); // 살짝 띄워서 그림
      c.update();
      c.display();
      pop();
    }
  }
}


// ==========================================
// 4. 모드 전환 로직 (상세 화면 <-> 일반)
// ==========================================

// 상세 모드 진입
function triggerDetailMode(card) {
  appMode = 'DETAIL';
  isHolding = false;
  focusedCard = card;
  
  // [중요] 드래그 상태 강제 종료 (버그 방지)
  card.stopDrag(); 
  card.isDragging = false; 
  currentCard = null; 

  // HTML UI 활성화
  document.getElementById('detail-layer').classList.add('active');
  document.getElementById('global-close-btn').classList.add('visible');
}

// 상세 모드 종료 (HTML 버튼에서 호출됨)
window.closeDetail = function() {
  // HTML UI 비활성화
  document.getElementById('detail-layer').classList.remove('active');
  document.getElementById('global-close-btn').classList.remove('visible');
  
  // 애니메이션 시간(0.4초) 후 p5 상태 복구
  setTimeout(() => {
    appMode = 'NORMAL';
    if (focusedCard) {
      // 위치나 회전 변경 없이 그대로 복귀 (뒷면 유지)
      focusedCard = null;
    }
  }, 400); 
};


// ==========================================
// 5. 입력 이벤트 핸들러 (마우스 & 터치)
// ==========================================

// 모바일 터치 처리 (브라우저 기본 동작 방지 및 매핑)
function touchStarted() {
  // UI 요소 터치 시에는 p5 무시
  if (appMode === 'DETAIL' || (event.target && event.target.tagName !== 'CANVAS')) {
    return true; 
  }
  mousePressed();
  return false; 
}

function touchMoved() {
  if (appMode === 'DETAIL' || (event.target && event.target.tagName !== 'CANVAS')) {
    return true;
  }
  mouseDragged();
  return false;
}

function touchEnded() {
  if (appMode === 'DETAIL' || (event.target && event.target.tagName !== 'CANVAS')) {
    return true;
  }
  mouseReleased();
  return false;
}

// 클릭/터치 시작
function mousePressed() {
  if (appMode === 'DETAIL') return; 

  pressStartTime = millis();
  holdStartTime = millis();
  isHolding = true; 

  // WebGL 좌표 보정
  let mX = mouseX - width/2;
  let mY = mouseY - height/2;

  if (touches.length > 0) {
    mX = touches[0].x - width/2;
    mY = touches[0].y - height/2;
  }

  // 역순 탐색 (위에 있는 카드부터 선택)
  for (let i = cards.length - 1; i >= 0; i--) {
    let card = cards[i];
    if (card.contains(mX, mY)) {
      currentCard = card;
      currentCard.startDrag(mX, mY);
      // 선택된 카드를 배열 맨 뒤로 보냄 (가장 위에 그려짐)
      cards.splice(i, 1);
      cards.push(currentCard);
      break;
    }
  }
}

// 드래그 중
function mouseDragged() {
  if (appMode === 'DETAIL') return;

  if (currentCard != null) {
    // 일정 거리 이상 움직이면 롱프레스 취소
    if (dist(mouseX, mouseY, pmouseX, pmouseY) > 5) {
      isHolding = false;
    }
    
    let mX = mouseX - width/2;
    let mY = mouseY - height/2;
    if (touches.length > 0) {
      mX = touches[0].x - width/2;
      mY = touches[0].y - height/2;
    }
    currentCard.updateDrag(mX, mY);
  }
}

// 클릭/터치 종료
function mouseReleased() {
  if (appMode === 'DETAIL') return;

  isHolding = false; 

  if (currentCard != null) {
    let duration = millis() - pressStartTime;
    // 짧게 클릭(0.2초 미만) 시 카드 뒤집기
    if (duration < 200) {
      currentCard.flip();
    }
    currentCard.stopDrag();
    currentCard = null;
    lastReleaseTime = millis();
  }
}

// 모바일: 기기 흔들기 감지
function deviceShaken() {
  if (appMode === 'DETAIL') return;
  if (millis() - lastReleaseTime < 200) return; // 드래그 직후 흔들림 방지

  lastShakeTime = millis();
  
  // 모든 카드에 랜덤한 힘 가하기
  for (let i = 0; i < cards.length; i++) {
    let card = cards[i];
    let randomAngle = random(TWO_PI);
    let forceMag = random(15, 25); 
    let forceX = cos(randomAngle) * forceMag;
    let forceY = sin(randomAngle) * forceMag;
    let randomSpin = random(-0.3, 0.3); 
    card.applyForce(forceX, forceY, randomSpin);
  }
}

// PC: 마우스 흔들기 감지
function mouseMoved() {
  if (isMobileDevice) return; // 모바일이면 무시
  if (appMode === 'DETAIL') return;
  if (millis() - lastReleaseTime < 200) return;

  let mouseSpeed = dist(mouseX, mouseY, pmouseX, pmouseY);

  if (mouseSpeed > mouseSpeedThreshold) {
    lastShakeTime = millis();
    let rawPushX = (mouseX - pmouseX) * 0.4;
    let rawPushY = (mouseY - pmouseY) * 0.4;
    let mX = mouseX - width/2;
    let mY = mouseY - height/2;

    // 마우스 근처의 카드들에 물리력 적용
    for (let i = 0; i < cards.length; i++) {
      let card = cards[i];
      let d = dist(mX, mY, card.x, card.y);
      if (d < shakeRadius) {
        // 물리적 다양성 부여 (Mass, Turbulence)
        let angleVariance = map(noise(i * 10, frameCount * 0.01), 0, 1, -PI/12, PI/12);
        let moveAngle = atan2(rawPushY, rawPushX);
        let finalAngle = moveAngle + angleVariance;
        
        let moveMag = dist(0, 0, rawPushX, rawPushY);
        let acceleration = moveMag / card.mass;
        
        let forceX = cos(finalAngle) * acceleration;
        let forceY = sin(finalAngle) * acceleration;
        
        let distFactor = map(d, 0, shakeRadius, 1.0, 0.2);
        let spinDir = (i % 2 == 0) ? 1 : -1;
        let randomSpin = (moveMag * 0.005) * spinDir * distFactor;
        
        card.applyForce(forceX * distFactor, forceY * distFactor, randomSpin);
      }
    }
  }
}

// 창 크기 변경 시
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || windowWidth < 800;
  calculateCardDimensions(); 
  
  // 모든 카드 크기 업데이트
  for (let card of cards) {
    card.w = cardW;
    card.h = cardH;
  }
}

// 각도 보간 함수 (부드러운 회전)
function lerpAngle(from, to, amt) {
  let diff = to - from;
  while (diff < -PI) diff += TWO_PI;
  while (diff > PI) diff -= TWO_PI;
  return from + diff * amt;
}


// ==========================================
// 6. BusinessCard 클래스 (명함 객체)
// ==========================================
class BusinessCard {
  constructor(tempX, tempY, tempAngle, tempBackColor) {
    this.x = tempX;
    this.y = tempY;
    this.z = 0;
    this.w = cardW; 
    this.h = cardH;
    this.angle = tempAngle;
    this.backColor = tempBackColor;

    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    this.isFlipping = false;
    this.flipAngle = 0;
    this.flipTarget = 0;
    this.flipSpeed = 0.15; 
    this.flipAnchorX = 0;
    this.flipAnchorY = 0;

    // 물리 엔진 변수
    this.velX = 0;
    this.velY = 0;
    this.angleVel = 0;
    this.mass = random(0.8, 1.4); // 무게
    this.damping = random(0.80, 0.88); // 마찰력
    this.angleDamping = 0.60; // 회전 저항
  }

  update() {
    // 드래그 중 물리 처리
    if (this.isDragging) {
      this.z = lerp(this.z, 10.0, 0.2); // 살짝 띄움
      
      let targetAngle = 0.0; // 수평으로 정렬하려는 힘
      this.angle = lerpAngle(this.angle, targetAngle, 0.1);

      this.velX = 0;
      this.velY = 0;
      this.angleVel = 0;
    } else {
      // 일반 상태 물리 처리
      this.z = lerp(this.z, 0.0, 0.1); // 바닥 착지

      this.x += this.velX;
      this.y += this.velY;
      this.angle += this.angleVel;

      this.velX *= this.damping;
      this.velY *= this.damping;
      this.angleVel *= this.angleDamping;

      // 화면 밖으로 나가지 않게 (벽 튕기기)
      let boundW = width/2 - this.w/2;
      let boundH = height/2 - this.h/2;
      
      if (this.x < -boundW) { this.x = -boundW; this.velX *= -0.5; }
      if (this.x > boundW) { this.x = boundW; this.velX *= -0.5; }
      if (this.y < -boundH) { this.y = -boundH; this.velY *= -0.5; }
      if (this.y > boundH) { this.y = boundH; this.velY *= -0.5; }
    }

    // 뒤집기 애니메이션
    if (this.isFlipping) {
      this.flipAngle = lerp(this.flipAngle, this.flipTarget, this.flipSpeed);
      if (abs(this.flipAngle - this.flipTarget) < 0.01) {
        this.flipAngle = this.flipTarget;
        this.isFlipping = false;
      }
    }
  }

  // 외부 힘 적용 (흔들기 등)
  applyForce(fX, fY, aVel) {
    if (!this.isDragging && appMode === 'NORMAL') {
      this.velX += fX;
      this.velY += fY;
      this.angleVel += aVel;
    }
  }

  // 그리기
  display() {
    push();
    translate(this.x, this.y, this.z);
    rotate(this.angle);

    // [수정 완료] 롱프레스 그림자 코드 삭제됨

    // 뒤집기 회전 적용
    translate(this.flipAnchorX, this.flipAnchorY, 0);
    rotateY(this.flipAngle);
    translate(-this.flipAnchorX, -this.flipAnchorY, 0);

    rectMode(CENTER);
    imageMode(CENTER);

    // 뒷면 그리기
    if (this.flipAngle > HALF_PI) {
      push();
      rotateY(PI);
      fill(this.backColor);
      rect(0, 0, this.w, this.h);
      pop();
    } else {
      // 앞면 그리기
      if (cardFrontImage) {
        image(cardFrontImage, 0, 0, this.w, this.h);
      } else {
        fill(255);
        rect(0, 0, this.w, this.h);
      }
    }
    pop();
  }

  // 동작 함수들
  flip() {
    this.isFlipping = true;
    this.flipTarget = (this.flipTarget == 0) ? PI : 0;
    this.flipAnchorX = 0;
    this.flipAnchorY = 0;
  }

  startDrag(mx, my) {
    this.isDragging = true;
    this.dragOffsetX = mx - this.x;
    this.dragOffsetY = my - this.y;
    this.velX = 0; this.velY = 0; this.angleVel = 0;
  }

  updateDrag(mx, my) {
    if (this.isDragging) {
      this.x = mx - this.dragOffsetX;
      this.y = my - this.dragOffsetY;
    }
  }

  stopDrag() {
    this.isDragging = false;
  }

  contains(mx, my) {
    let dx = mx - this.x;
    let dy = my - this.y;
    let cosA = cos(-this.angle);
    let sinA = sin(-this.angle);
    let unrotatedX = dx * cosA - dy * sinA;
    let unrotatedY = dx * sinA + dy * cosA;
    return (abs(unrotatedX) < this.w / 2 && abs(unrotatedY) < this.h / 2);
  }
}
