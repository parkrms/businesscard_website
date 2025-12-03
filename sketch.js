// 1. 전역 변수 설정
let cardFrontImage;
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

let holdStartTime = 0;
let isHolding = false;
let holdDuration = 1500; 
let appMode = 'NORMAL'; 
let focusedCard = null; 

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
  
  // 모바일 여부 체크
  isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || windowWidth < 800;

  if (isMobileDevice) {
    holdDuration = 1000; // 모바일 1초
    setShakeThreshold(30); 
  } else {
    holdDuration = 1500; // PC 1.5초
  }

  calculateCardDimensions();
  
  for (let hex of backColorsHex) {
    backColors.push(color(hex));
  }

  // [수정] 배치 범위 확장 (뭉침 방지)
  // safeMargin을 줄여서 화면 끝까지 꽉 차게 배치
  for (let i = 0; i < numCards; i++) {
    let safeMarginX = cardW * 0.6; // 카드가 화면 밖으로 살짝만 안 나가게
    let safeMarginY = cardH * 0.6;
    
    let rX = random(-width/2 + safeMarginX, width/2 - safeMarginX);
    let rY = random(-height/2 + safeMarginY, height/2 - safeMarginY);
    let rAngle = random(TWO_PI);
    cards.push(new BusinessCard(rX, rY, rAngle, backColors[i % backColors.length]));
  }
}

function calculateCardDimensions() {
  // [수정] 카드 크기 축소 (요청사항 반영)
  // PC: 0.25 -> 0.22, Mobile: 0.6 -> 0.55
  let ratio = isMobileDevice ? 0.55 : 0.22;
  
  // 최소/최대 크기 제한도 조금 줄임
  cardW = constrain(windowWidth * ratio, 180, 500); 
  cardH = cardW * (50 / 90); 
  shakeRadius = cardW * 0.8; 
}

function draw() {
  background(51); 
  lights(); 
  
  // 1. 롱프레스 체크
  if (appMode === 'NORMAL' && isHolding && currentCard) {
    if (abs(currentCard.flipAngle - PI) < 0.2) {
      if (millis() - holdStartTime > holdDuration) {
        triggerDetailMode(currentCard);
      }
    } else {
      isHolding = false; 
    }
  }

  // 2. 카드 그리기
  // 상세 모드일 때는 주인공 카드를 캔버스에서 숨김 (안 그림)
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

// 모바일 흔들기 (p5.js 내장)
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

function triggerDetailMode(card) {
  appMode = 'DETAIL';
  isHolding = false;
  focusedCard = card;
  currentCard = null; 

  // [수정] HTML 카드 관련 코드 삭제 (이미지 안 띄움)
  // 오직 레이어만 활성화
  document.getElementById('detail-layer').classList.add('active');
}

window.closeDetail = function() {
  let layer = document.getElementById('detail-layer');
  layer.classList.remove('active');
  
  // HTML 카드가 없으므로 바로 복귀 타이머 가동
  setTimeout(() => {
    appMode = 'NORMAL';
    if (focusedCard) {
      // 위치나 상태 변화 없이 그대로 복귀 (뒷면 상태 유지)
      focusedCard = null;
    }
  }, 500); 
};

// --- [핵심 수정] 터치 이벤트 처리 ---
function touchStarted() {
  // 1. 상세 모드이거나
  // 2. 캔버스가 아닌 UI요소(버튼, 모달 등)를 터치했다면
  // => p5.js가 개입하지 말고 브라우저 기본 동작(클릭, 스크롤) 허용
  if (appMode === 'DETAIL' || (event.target && event.target.tagName !== 'CANVAS')) {
    return true; 
  }
  
  // 캔버스 터치일 때만 p5 로직 실행 및 기본 동작 차단
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
// -------------------------------------

function mousePressed() {
  if (appMode === 'DETAIL') return; 

  pressStartTime = millis();
  holdStartTime = millis();
  isHolding = true; 

  let mX = mouseX - width/2;
  let mY = mouseY - height/2;

  // 터치 좌표 보정
  if (touches.length > 0) {
    mX = touches[0].x - width/2;
    mY = touches[0].y - height/2;
  }

  for (let i = cards.length - 1; i >= 0; i--) {
    let card = cards[i];
    if (card.contains(mX, mY)) {
      currentCard = card;
      currentCard.startDrag(mX, mY);
      cards.splice(i, 1);
      cards.push(currentCard);
      break;
    }
  }
}

function mouseDragged() {
  if (appMode === 'DETAIL') return;

  if (currentCard != null) {
    // 드래그 발생 시 롱프레스 취소
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

function mouseReleased() {
  if (appMode === 'DETAIL') return;

  isHolding = false; 

  if (currentCard != null) {
    let duration = millis() - pressStartTime;
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


// 5. BusinessCard 클래스
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

    // [수정] 롱프레스 그림자 코드 삭제됨 (요청사항 반영)

    translate(this.flipAnchorX, this.flipAnchorY, 0);
    rotateY(this.flipAngle);
    translate(-this.flipAnchorX, -this.flipAnchorY, 0);

    rectMode(CENTER);
    imageMode(CENTER);

    if (this.flipAngle > HALF_PI) {
      push();
      rotateY(PI);
      fill(this.backColor);
      rect(0, 0, this.w, this.h);
      pop();
    } else {
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
}
