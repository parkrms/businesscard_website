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

// 가장 최근에 뒤집힌 카드
let latestFlippedCard = null; 

// PC 마우스 흔들기 감도
let mouseSpeedThreshold = 100.0; 
let shakeRadius; 

let isMobileDevice = false;

let lastReleaseTime = 0;
let lastShakeTime = 0;

let holdStartTime = 0;
let isHolding = false;
let holdDuration = 1500; 
let appMode = 'NORMAL'; 
let focusedCard = null; 

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
    holdDuration = 1000; 
    setShakeThreshold(30); 
  } else {
    holdDuration = 1500; 
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
    let safeMarginX = cardW * 0.1; 
    let safeMarginY = cardH * 0.1;
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
  
  // 카드 그리기
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

// --- 입력 처리 (모바일/PC 통합) ---

function touchStarted(e) {
  if (appMode === 'DETAIL' || (e.target && e.target.tagName !== 'CANVAS')) return true; 
  if (touches.length > 0) {
    handleInputStart(touches[0].x, touches[0].y);
  }
  return false; 
}
function touchMoved(e) {
  if (appMode === 'DETAIL' || (e.target && e.target.tagName !== 'CANVAS')) return true;
  if (touches.length > 0) {
    handleInputMove(touches[0].x, touches[0].y);
  }
  return false;
}
function touchEnded(e) {
  if (appMode === 'DETAIL' || (e.target && e.target.tagName !== 'CANVAS')) return true;
  handleInputEnd();
  return false;
}

function mousePressed() {
  handleInputStart(mouseX, mouseY);
}
function mouseDragged() {
  handleInputMove(mouseX, mouseY);
}
function mouseReleased() {
  handleInputEnd();
}

function handleInputStart(x, y) {
  if (appMode === 'DETAIL') return; 
  pressStartTime = millis();
  let mX = x - width/2;
  let mY = y - height/2;

  for (let i = cards.length - 1; i >= 0; i--) {
    let card = cards[i];
    if (card.contains(mX, mY)) {
      // 1. 플러스 버튼 클릭 확인
      if (latestFlippedCard === card && card.isPlusClicked(mX, mY)) {
        clickedArrowOnCard = card;
      } else {
        // 2. 일반 드래그
        currentCard = card;
        currentCard.startDrag(mX, mY);
        cards.splice(i, 1);
        cards.push(currentCard);
        
        if (abs(card.flipAngle - PI) < 0.2) {
          latestFlippedCard = card;
        }
      }
      break;
    }
  }
}

function handleInputMove(x, y) {
  if (appMode === 'DETAIL') return;
  if (clickedArrowOnCard) {
    clickedArrowOnCard = null;
    return;
  }
  if (currentCard != null) {
    let mX = x - width/2;
    let mY = y - height/2;
    currentCard.updateDrag(mX, mY);
  }
}

function handleInputEnd() {
  if (appMode === 'DETAIL') return;
  
  if (clickedArrowOnCard) {
    triggerDetailMode(clickedArrowOnCard);
    clickedArrowOnCard = null;
    return;
  }

  if (currentCard != null) {
    let duration = millis() - pressStartTime;
    if (duration < 200) {
      currentCard.flip();
      latestFlippedCard = currentCard;
    }
    currentCard.stopDrag();
    currentCard = null;
  }
}

// PC 마우스 흔들기
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

    for (let i = 0; i < cards.length; i++) {
      let card = cards[i];
      let d = dist(mX, mY, card.x, card.y);
      if (d < shakeRadius) {
        let distFactor = map(d, 0, shakeRadius, 1.0, 0.2);
        let randomSpin = random(-0.2, 0.2) * distFactor;
        card.applyForce(rawPushX * distFactor, rawPushY * distFactor, randomSpin);
      }
    }
  }
}

// 모바일 흔들기 (자연스럽게)
function deviceShaken() {
  if (appMode === 'DETAIL') return;
  if (millis() - lastReleaseTime < 200) return;
  if (millis() - lastShakeTime < 300) return;
  
  lastShakeTime = millis();
  
  for (let i = 0; i < cards.length; i++) {
    let card = cards[i];
    let randomAngle = random(TWO_PI);
    let forceMag = random(5, 15); // 힘을 적당히 (자연스럽게)
    let forceX = cos(randomAngle) * forceMag;
    let forceY = sin(randomAngle) * forceMag;
    let randomSpin = random(-0.2, 0.2); 
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
    
    this.mass = 1.0; 
    // 마찰력: 0.85 (얼음판 X, 종이 O)
    this.damping = 0.85; 
    this.angleDamping = 0.90; 
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
      
      // [수정] + 아이콘 (얇고, 작게, 오른쪽 하단)
      if (latestFlippedCard === this) {
        // 위치: 왼쪽 가장자리(-w/2)에서 안쪽으로 20px
        // (rotateY(PI) -> 로컬 왼쪽 = 시각적 오른쪽)
        let btnX = -this.w/2 + 20; 
        let btnY = this.h/2 - 20; 
        
        push();
        translate(btnX, btnY, 5); 
        
        // 얇은 십자가(+)
        stroke(0); // 진한 검정
        strokeWeight(1.5); // 얇게
        strokeCap(SQUARE);
        
        let size = 6; // 작게
        line(-size, 0, size, 0); 
        line(0, -size, 0, size); 
        
        pop();
      }
      
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

  // [수정] 플러스 아이콘 클릭 감지 (좌표계 수정됨)
  isPlusClicked(mx, my) {
    if (abs(this.flipAngle - PI) > 0.2) return false;
    if (latestFlippedCard !== this) return false;

    let dx = mx - this.x;
    let dy = my - this.y;
    let cosA = cos(-this.angle);
    let sinA = sin(-this.angle);
    
    let unrotatedX = dx * cosA - dy * sinA;
    let unrotatedY = dx * sinA + dy * cosA;
    
    // 버튼 위치 (display와 동일)
    let btnX = -this.w/2 + 20; 
    let btnY = this.h/2 - 20;
    
    // [중요] unrotatedX는 화면상 좌표(카드 중심 기준).
    // 카드가 뒤집혀있으므로(rotateY), 화면 오른쪽 클릭은 로컬 왼쪽(-X)에 매핑됨.
    // 따라서 -unrotatedX (부호 반전) 값과 btnX (음수) 값을 비교해야 함.
    
    // 반경 30px (시각적 크기보다 훨씬 넓게 잡음 -> 터치 용이)
    if (dist(-unrotatedX, unrotatedY, btnX, btnY) < 30) {
      return true;
    }
    return false;
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
