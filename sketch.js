// 1. 전역 변수 설정
let cardFrontImage;
let shadowTexture;
let cards = [];
let numCards = 10;
let cardW, cardH; 

let backColorsHex = [
  "#FFB4B4", "#FFDCB4", "#FFFFB4", "#DCFFB4", "#B4FFB4",
  "#B4FFDC", "#B4FFFF", "#B4DCFF", "#B4B4FF", "#DCB4FF"
];
let backColors = [];

let currentCard = null;
let pressStartTime;

// 마우스(PC) 흔들기 설정
let mouseSpeedThreshold = 360.0; 
let shakeRadius; 

// 모바일 감지 변수
let isMobileDevice = false;

let lastReleaseTime = 0;
let lastShakeTime = 0;

let appMode = 'NORMAL'; 
let focusedCard = null; 

// [NEW] 화살표 클릭 감지용 변수
let clickedArrowOnCard = null; 

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
  
  isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || windowWidth < 800;

  if (isMobileDevice) {
    setShakeThreshold(30); 
  }

  calculateCardDimensions();
  
  // 그림자 텍스처
  let shadowTextureWidth = cardW * 1.5; 
  let shadowTextureHeight = cardH * 1.5; 
  shadowTexture = createGraphics(shadowTextureWidth, shadowTextureHeight);
  shadowTexture.noStroke();
  shadowTexture.rectMode(CENTER); 
  for(let i = 40; i > 0; i -= 1) { 
    let alpha = map(i, 40, 0, 0, 200); 
    alpha = pow(alpha / 200, 2.0) * 200; 
    shadowTexture.fill(0, 0, 0, alpha);
    let currentW = shadowTextureWidth * (i / 40);
    let currentH = shadowTextureHeight * (i / 40);
    shadowTexture.rect(shadowTexture.width/2, shadowTexture.height/2, currentW, currentH, 20); 
  }

  for (let hex of backColorsHex) {
    backColors.push(color(hex));
  }

  // 명함 배치
  for (let i = 0; i < numCards; i++) {
    let safeMarginX = cardW * 0.6; 
    let safeMarginY = cardH * 0.6;
    let rX = random(-width/2 + safeMarginX, width/2 - safeMarginX);
    let rY = random(-height/2 + safeMarginY, height/2 - safeMarginY);
    let rAngle = random(TWO_PI);
    cards.push(new BusinessCard(rX, rY, rAngle, backColors[i % backColors.length]));
  }
}

function calculateCardDimensions() {
  let ratio = isMobileDevice ? 0.55 : 0.25;
  cardW = constrain(windowWidth * ratio, 200, 500); 
  cardH = cardW * (50 / 90); 
  shakeRadius = cardW * 0.8; 
}

function draw() {
  background(40); 
  lights(); 
  
  // 2. 카드 그리기
  for (let i = 0; i < cards.length; i++) {
    let c = cards[i];
    if (c === focusedCard) continue; 
    
    if (!c.isDragging && !c.isFlipping) {
      push();
      translate(0, 0, i * 1); 
      c.update();
      c.display();
      pop();
    }
  }

  drawingContext.clear(drawingContext.DEPTH_BUFFER_BIT);

  for (let i = 0; i < cards.length; i++) {
    let c = cards[i];
    if (c === focusedCard) continue;

    if (c.isDragging || c.isFlipping) {
      push();
      translate(0, 0, 10); 
      c.update();
      c.display();
      pop();
    }
  }
}

function triggerDetailMode(card) {
  appMode = 'DETAIL';
  focusedCard = card;
  
  card.stopDrag(); 
  card.isDragging = false; 
  currentCard = null; 

  document.getElementById('detail-layer').classList.add('active');
  document.getElementById('global-close-btn').classList.add('visible');
}

window.closeDetail = function() {
  let layer = document.getElementById('detail-layer');
  layer.classList.remove('active');
  document.getElementById('global-close-btn').classList.remove('visible');
  
  setTimeout(() => {
    appMode = 'NORMAL';
    if (focusedCard) {
      focusedCard = null;
    }
  }, 400); 
};

// --- 입력 이벤트 처리 ---

function touchStarted() {
  if (appMode === 'DETAIL' || (event.target && event.target.tagName !== 'CANVAS')) return true; 
  mousePressed();
  return false; 
}
function touchMoved() {
  if (appMode === 'DETAIL' || (event.target && event.target.tagName !== 'CANVAS')) return true;
  mouseDragged();
  return false;
}
function touchEnded() {
  if (appMode === 'DETAIL' || (event.target && event.target.tagName !== 'CANVAS')) return true;
  mouseReleased();
  return false;
}

function mousePressed() {
  if (appMode === 'DETAIL') return; 

  pressStartTime = millis();
  let mX = mouseX - width/2;
  let mY = mouseY - height/2;
  if (touches.length > 0) {
    mX = touches[0].x - width/2;
    mY = touches[0].y - height/2;
  }

  // 역순 탐색
  for (let i = cards.length - 1; i >= 0; i--) {
    let card = cards[i];
    if (card.contains(mX, mY)) {
      // 1. 뒤집힌 상태이고, 화살표 버튼을 클릭했는지 확인
      if (card.isArrowClicked(mX, mY)) {
        clickedArrowOnCard = card; // 화살표 클릭 상태 저장
        // 드래그 시작 안 함
      } else {
        // 2. 일반 카드 영역 클릭 -> 드래그 시작
        currentCard = card;
        currentCard.startDrag(mX, mY);
        cards.splice(i, 1);
        cards.push(currentCard);
      }
      break;
    }
  }
}

function mouseDragged() {
  if (appMode === 'DETAIL') return;
  // 화살표를 눌렀다가 드래그하면 취소
  if (clickedArrowOnCard) {
    clickedArrowOnCard = null;
    return;
  }

  if (currentCard != null) {
    let mX = mouseX - width/2;
    let mY = mouseY - height/2;
    if (touches.length > 0) {
      mX = touches[0].x - width/2;
      mY = touches[0].y - height/2;
    }
    currentCard.updateDrag(mX, mY);
  }
}

function mouseReleased() {
  if (appMode === 'DETAIL') return;

  // 1. 화살표 클릭 완료 -> 상세 페이지 이동
  if (clickedArrowOnCard) {
    triggerDetailMode(clickedArrowOnCard);
    clickedArrowOnCard = null;
    return;
  }

  // 2. 일반 드래그/클릭 해제
  if (currentCard != null) {
    let duration = millis() - pressStartTime;
    // 짧게 클릭하면 뒤집기 (드래그 안 했을 때)
    if (duration < 200) {
      currentCard.flip();
    }
    currentCard.stopDrag();
    currentCard = null;
    lastReleaseTime = millis();
  }
}

function mouseMoved() {
  if (isMobileDevice) return; 
  if (appMode === 'DETAIL') return;
  if (millis() - lastReleaseTime < 200) return;

  let mouseSpeed = dist(mouseX, mouseY, pmouseX, pmouseY);

  if (mouseSpeed > mouseSpeedThreshold) {
    lastShakeTime = millis();
    let rawPushX = (mouseX - pmouseX) * 0.4;
    let rawPushY = (mouseY - pmouseY) * 0.4;
    let mX = mouseX - width/2;
    let mY = mouseY - height/2;
    let moveAngle = atan2(rawPushY, rawPushX);
    let moveMag = dist(0, 0, rawPushX, rawPushY);

    for (let i = 0; i < cards.length; i++) {
      let card = cards[i];
      let d = dist(mX, mY, card.x, card.y);
      if (d < shakeRadius) {
        let angleVariance = map(noise(i * 10, frameCount * 0.01), 0, 1, -PI/12, PI/12);
        let finalAngle = moveAngle + angleVariance;
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

function deviceShaken() {
  if (appMode === 'DETAIL') return;
  if (millis() - lastReleaseTime < 200) return;
  lastShakeTime = millis();
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

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || windowWidth < 800;
  calculateCardDimensions(); 
  for (let card of cards) {
    card.w = cardW;
    card.h = cardH;
  }
}

function lerpAngle(from, to, amt) {
  let diff = to - from;
  while (diff < -PI) diff += TWO_PI;
  while (diff > PI) diff -= TWO_PI;
  return from + diff * amt;
}


// 6. BusinessCard 클래스
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

    this.velX = 0;
    this.velY = 0;
    this.angleVel = 0;
    
    this.mass = random(0.8, 1.4);
    this.damping = random(0.80, 0.88); 
    this.angleDamping = 0.60; 
  }

  update() {
    if (this.isDragging) {
      this.z = lerp(this.z, 10.0, 0.2);
      let targetAngle = 0.0;
      this.angle = lerpAngle(this.angle, targetAngle, 0.1);
      this.velX = 0; this.velY = 0; this.angleVel = 0;
    } else {
      this.z = lerp(this.z, 0.0, 0.1);
      this.x += this.velX;
      this.y += this.velY;
      this.angle += this.angleVel;
      this.velX *= this.damping;
      this.velY *= this.damping;
      this.angleVel *= this.angleDamping;

      let boundW = width/2 - this.w/2;
      let boundH = height/2 - this.h/2;
      if (this.x < -boundW) { this.x = -boundW; this.velX *= -0.5; }
      if (this.x > boundW) { this.x = boundW; this.velX *= -0.5; }
      if (this.y < -boundH) { this.y = -boundH; this.velY *= -0.5; }
      if (this.y > boundH) { this.y = boundH; this.velY *= -0.5; }
    }

    if (this.isFlipping) {
      this.flipAngle = lerp(this.flipAngle, this.flipTarget, this.flipSpeed);
      if (abs(this.flipAngle - this.flipTarget) < 0.01) {
        this.flipAngle = this.flipTarget;
        this.isFlipping = false;
      }
    }
  }

  applyForce(fX, fY, aVel) {
    if (!this.isDragging && appMode === 'NORMAL') {
      this.velX += fX;
      this.velY += fY;
      this.angleVel += aVel;
    }
  }

  display() {
    push();
    translate(this.x, this.y, this.z);
    rotate(this.angle);

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
      
      // [NEW] 오른쪽 하단 화살표 (↘) 그리기
      fill(0); // 검은색 화살표
      textAlign(RIGHT, BOTTOM);
      textSize(32); 
      // 위치: 카드 오른쪽 아래 (여백 20px)
      text("↘", this.w/2 - 10, this.h/2 - 10);
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

  // [NEW] 화살표 버튼 클릭 체크 함수
  isArrowClicked(mx, my) {
    // 뒷면이 아닐 때는 클릭 불가
    if (abs(this.flipAngle - PI) > 0.2) return false;

    // 마우스 좌표를 카드 로컬 좌표로 변환
    let dx = mx - this.x;
    let dy = my - this.y;
    let cosA = cos(-this.angle);
    let sinA = sin(-this.angle);
    // 뒤집힌 상태이므로 X축 반전 고려해야 하지만, 
    // display에서 rotateY(PI)를 했으므로 시각적으로는 오른쪽 아래가 맞음.
    // 하지만 물리적 좌표계에서는 왼쪽 아래일 수 있음.
    // rotateY(PI)는 좌우를 반전시키므로, 화면상 오른쪽 아래는 로컬 좌표상 왼쪽 아래(-x, +y)일 수 있음.
    // 확인: rotateY(PI) -> x축 반전. 
    // 화면상 우하단(+,+) -> 로컬상 (-, +) 가 됨.
    // 화살표는 text("↘", this.w/2 - 10, this.h/2 - 10)에 그려짐 (로컬 좌표상 우하단)
    // 따라서 로컬 좌표계에서 우하단 영역을 체크하면 됨.
    
    let unrotatedX = dx * cosA - dy * sinA;
    let unrotatedY = dx * sinA + dy * cosA;
    
    // 뒤집혔으므로 x좌표 반전 (rotateY(PI) 효과 상쇄)
    unrotatedX = -unrotatedX; 

    // 화살표 위치: 우하단 (w/2 - 10, h/2 - 10) 주변 40px
    let arrowX = this.w/2 - 25; 
    let arrowY = this.h/2 - 25;
    
    // 화살표 중심에서 거리 체크 (반경 30px)
    if (dist(unrotatedX, unrotatedY, arrowX, arrowY) < 40) {
      return true;
    }
    return false;
  }
}
