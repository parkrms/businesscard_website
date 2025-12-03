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

  // 롱프레스 시간 설정
  if (isMobileDevice) {
    holdDuration = 1000; // 모바일 1초
    setShakeThreshold(30); 
  } else {
    holdDuration = 1500; // PC 1.5초
  }

  calculateCardDimensions();
  
  // 그림자 텍스처 생성
  let shadowTextureWidth = cardW * 1.5; 
  let shadowTextureHeight = cardH * 1.5; 
  
  shadowTexture = createGraphics(shadowTextureWidth, shadowTextureHeight);
  shadowTexture.noStroke();
  shadowTexture.rectMode(CENTER); 
  
  for(let i = 40; i > 0; i -= 1) { 
    let alpha = map(i, 40, 0, 0, 255); 
    alpha = pow(alpha / 255, 2.0) * 255; 
    shadowTexture.fill(0, 0, 0, alpha);
    let currentW = shadowTextureWidth * (i / 40);
    let currentH = shadowTextureHeight * (i / 40);
    shadowTexture.rect(shadowTexture.width/2, shadowTexture.height/2, currentW, currentH, 15); 
  }

  for (let hex of backColorsHex) {
    backColors.push(color(hex));
  }

  // [수정] 배치 범위 확장
  // 기존: width/2 - cardW (명함 전체 너비만큼 안쪽으로 들어옴 -> 중앙에 뭉침)
  // 수정: width/2 - cardW/2 (명함 절반 너비만큼만 안쪽으로 -> 화면 꽉 채움)
  for (let i = 0; i < numCards; i++) {
    let safeMarginX = cardW / 2;
    let safeMarginY = cardH / 2;
    
    let rX = random(-width/2 + safeMarginX, width/2 - safeMarginX);
    let rY = random(-height/2 + safeMarginY, height/2 - safeMarginY);
    let rAngle = random(TWO_PI);
    cards.push(new BusinessCard(rX, rY, rAngle, backColors[i % backColors.length]));
  }
}

function calculateCardDimensions() {
  // 모바일이면 카드를 조금 더 크게 보이게 비율 조정
  let ratio = isMobileDevice ? 0.6 : 0.25;
  cardW = constrain(windowWidth * ratio, 220, 550); 
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

// p5.js 내장 흔들기 감지 함수 (모바일용)
function deviceShaken() {
  if (appMode === 'DETAIL') return;
  if (millis() - lastReleaseTime < 200) return;

  lastShakeTime = millis();
  
  for (let i = 0; i < cards.length; i++) {
    let card = cards[i];
    
    let randomAngle = random(TWO_PI);
    let forceMag = random(10, 20); 
    
    let forceX = cos(randomAngle) * forceMag;
    let forceY = sin(randomAngle) * forceMag;
    
    let randomSpin = random(-0.2, 0.2); 
    
    card.applyForce(forceX, forceY, randomSpin);
  }
}

function triggerDetailMode(card) {
  appMode = 'DETAIL';
  isHolding = false;
  focusedCard = card;
  currentCard = null; 

  let htmlCard = document.getElementById('html-card');
  let c = card.backColor;
  htmlCard.style.backgroundColor = `rgb(${red(c)}, ${green(c)}, ${blue(c)})`;
  htmlCard.style.width = card.w + 'px'; 
  htmlCard.style.height = card.h + 'px';
  
  let p5X_global = card.x + width/2; 
  let p5Y_global = card.y + height/2;
  htmlCard.style.left = p5X_global + 'px';
  htmlCard.style.top = p5Y_global + 'px';
  
  document.getElementById('detail-layer').classList.add('active');
}

window.closeDetail = function() {
  let layer = document.getElementById('detail-layer');
  let htmlCard = document.getElementById('html-card');

  if (focusedCard) {
    let p5X_global = focusedCard.x + width/2;
    let p5Y_global = focusedCard.y + height/2;
    htmlCard.style.left = p5X_global + 'px';
    htmlCard.style.top = p5Y_global + 'px';
    
    htmlCard.style.transform = `translate(-50%, -50%) rotateY(180deg)`;
    htmlCard.style.boxShadow = `0 0 0 rgba(0,0,0,0)`;
  }
  
  layer.classList.remove('active');
  
  setTimeout(() => {
    appMode = 'NORMAL';
    if (focusedCard) {
      focusedCard = null;
    }
    htmlCard.style.left = '50%';
    htmlCard.style.top = '50%';
    htmlCard.style.transform = 'translate(-50%, -50%) rotateY(180deg)'; 
  }, 800); 
};

// --- [핵심] 모바일 터치 이벤트 매핑 ---
function touchStarted() {
  mousePressed();
  // 터치 시 브라우저 기본 동작(스크롤 등) 방지
  return false; 
}

function touchMoved() {
  mouseDragged();
  return false;
}

function touchEnded() {
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

  // 터치 좌표 보정 (p5.js는 touchX/Y를 mouseX/Y에 매핑하지만 간혹 오류가 있을 수 있어 확인)
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
    // 짧게 클릭하면 뒤집기
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

      this.velX = 0;
      this.velY = 0;
      this.angleVel = 0;
    } else {
      this.z = lerp(this.z, 0.0, 0.1);

      this.x += this.velX;
      this.y += this.velY;
      this.angle += this.angleVel;

      this.velX *= this.damping;
      this.velY *= this.damping;
      this.angleVel *= this.angleDamping;

      // 화면 바운스
      // 모바일 등에서 화면 크기 변경 시 카드 크기(w, h)를 동적으로 참조
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

    // 롱프레스 그림자 확장 애니메이션
    if (appMode === 'NORMAL' && isHolding && currentCard === this && abs(this.flipAngle - PI) < 0.2) {
      let holdProgress = constrain((millis() - holdStartTime) / holdDuration, 0, 1);
      let ease = holdProgress * holdProgress; 
      let shadowScale = map(ease, 0, 1, 1.0, 1.15);
      
      push();
      translate(0, 0, -2); 
      scale(shadowScale); 
      imageMode(CENTER);
      image(shadowTexture, 0, 0, this.w, this.h); 
      pop();
    }

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
