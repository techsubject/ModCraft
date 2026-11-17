(function() {
    let mapInstance = null;
    let isRaceActive = false;
    let ghostTrails = [];
    let isManuallyClosed = false;

    class DashMinimap {
        constructor(canvEl) {
            this.ctx = canvEl.getContext('2d');
            this.canv = canvEl;
            this.canv.width = 1500;  
            this.canv.height = 1500;
            this.trackPieces = [];
            this.ghosts = [];
            this.poolSet = new Set();
        }

        sineWave(x, y, width, height, invert) {
            const ctx = this.ctx;
            ctx.moveTo(x, y);
            for (let i = 0; i < height; i++) {
                let sineVal = Math.sin((i - height / 2) * Math.PI / height) * width / 2 + width / 2;
                if (invert) {
                    ctx.lineTo(x + sineVal, y - i);
                } else {
                    ctx.lineTo(x + sineVal, y + i);
                }
            }
        }

buildPoolSet() {
            this.poolSet.clear();
            for (const p of this.trackPieces) {
                if (p.id === 153 || p.id === 157) {
                    this.poolSet.add(`${Math.round(p.p[0])},${Math.round(p.p[1])},${Math.round(p.p[2])}`);
                }
            }
        }

        drawPoolPiece(p, isRounded) {
            const ctx = this.ctx;
            const [x, y, z] = p.p;
            const step = 30; // 2x2 pool center-to-center distance in JSON units (2 * 15)

            // Check neighbors in world space, then rotate neighbor flags into local piece space
            const worldN = this.poolSet.has(`${Math.round(x)},${Math.round(y)},${Math.round(z + step)}`);
            const worldS = this.poolSet.has(`${Math.round(x)},${Math.round(y)},${Math.round(z - step)}`);
            const worldW = this.poolSet.has(`${Math.round(x - step)},${Math.round(y)},${Math.round(z)}`);
            const worldE = this.poolSet.has(`${Math.round(x + step)},${Math.round(y)},${Math.round(z)}`);

            const rot = (((p.r || 0) % 360) + 360) % 360;
            let hasTop = worldN, hasRight = worldE, hasBottom = worldS, hasLeft = worldW;
            if (rot === 90) {
                hasTop = worldW; hasRight = worldN; hasBottom = worldE; hasLeft = worldS;
            } else if (rot === 180) {
                hasTop = worldS; hasRight = worldW; hasBottom = worldN; hasLeft = worldE;
            } else if (rot === 270) {
                hasTop = worldE; hasRight = worldS; hasBottom = worldW; hasLeft = worldN;
            }

            const size = 30; // 2x2 = 30px in JSON units
            const half = 15;
            const r = isRounded ? 6 : 0;

            const radii = [
                (!hasTop && !hasLeft) ? r : 0,
                (!hasTop && !hasRight) ? r : 0,
                (!hasBottom && !hasRight) ? r : 0,
                (!hasBottom && !hasLeft) ? r : 0
            ];

            // White outer border
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.roundRect(-half, -half, size, size, radii);
            ctx.fill();

            // Blue water center (flush on edges touching another pool)
            const b = 3;
            const insetL = hasLeft ? 0 : b;
            const insetR = hasRight ? 0 : b;
            const insetT = hasTop ? 0 : b;
            const insetB = hasBottom ? 0 : b;
            const innerRadii = radii.map(rad => Math.max(0, rad - 2));

            ctx.fillStyle = "#22a1e3";
            ctx.beginPath();
            ctx.roundRect(
                -half + insetL,
                -half + insetT,
                size - insetL - insetR,
                size - insetT - insetB,
                innerRadii
            );
            ctx.fill();
        }

        drawPieceAtOrigin(p) {
            const ctx = this.ctx;
            const id = p.id;
        
            const road = "#a5a5a5", yellow = "#ffcf00", finish = "#ef3533", border = "#363636";
            const blue = "#22a1e3", white = "#ffffff", platformEdge = "#555555", roadPlatform = "#808080";
            const tube = "#4facfe", lightgrass = "#7cfc00", darkgrass = "#228b22", tree = "#2d5a27";
            const ice = "#d8ffff", dirt = "#b57a49";
        
            ctx.lineWidth = 1;
        
            if (id == 1) {
                ctx.fillStyle = road;
                ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = yellow;
                ctx.fillRect(-11, -15, 4, 30);
                ctx.fillRect(7, -15, 4, 30);
                ctx.fillStyle = blue;
                ctx.fillRect(-11, -4, 22, 8);
                ctx.fillStyle = white;
                for (let i = 0; i < 3; i++) {
                    ctx.fillRect(-12 + i * 8, -4, 4, 4);
                    ctx.fillRect(-8 + i * 8, 0, 4, 4);
                }
                ctx.fillStyle = border;
                ctx.fillRect(-15, -15, 4, 30);
                ctx.fillRect(11, -15, 4, 30);
            }
            else if (id == 2) {
                ctx.fillStyle = road;
                ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = border;
                ctx.fillRect(-15, -15, 4, 30);
                ctx.fillRect(11, -15, 4, 30);
                ctx.fillStyle = yellow;
                ctx.fillRect(-11, -15, 4, 30);
                ctx.fillRect(7, -15, 4, 30);
                ctx.fillStyle = finish;
                ctx.fillRect(-11, -4, 22, 8);
            }
            else if (id == 3 || id == 24 || id == 49) {
                ctx.fillStyle = road;
                ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = border;
                ctx.fillRect(-15, -15, 4, 30);
                ctx.fillRect(11, -15, 4, 30);
                ctx.fillStyle = yellow;
                ctx.fillRect(-11, -15, 4, 30);
                ctx.fillRect(7, -15, 4, 30);
            }
            else if (id == 4) {
                ctx.fillStyle = road;
                ctx.beginPath();
                ctx.arc(15, 15, 30, Math.PI, Math.PI / 2 * 3);
                ctx.lineTo(15, 15);
                ctx.fill();
                ctx.fillStyle = border;
                ctx.beginPath(); ctx.arc(15, 15, 4, Math.PI, Math.PI / 2 * 3); ctx.lineTo(15, 15); ctx.fill();
                ctx.beginPath(); ctx.arc(15, 15, 28, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.strokeStyle = yellow;
                ctx.beginPath(); ctx.arc(15, 15, 6, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.beginPath(); ctx.arc(15, 15, 24, Math.PI, Math.PI / 2 * 3); ctx.stroke();
            }
            else if (id == 6 || id == 57 || id == 58) {
                ctx.fillStyle = road;
                ctx.beginPath();
                ctx.arc(30, 30, 60, Math.PI, Math.PI / 2 * 3);
                ctx.arc(30, 30, 30, Math.PI / 2 * 3, Math.PI, true);
                ctx.fill();
                ctx.fillStyle = border;
                ctx.beginPath(); ctx.arc(30, 30, 58, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.beginPath(); ctx.arc(30, 30, 32, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.strokeStyle = yellow;
                ctx.beginPath(); ctx.arc(30, 30, 36, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.beginPath(); ctx.arc(30, 30, 54, Math.PI, Math.PI / 2 * 3); ctx.stroke();
            }
            else if (id == 8 || id == 52 || id == 53 || id == 75 || id == 62 || id == 79 || id == 77) {
                ctx.fillStyle = road;
                ctx.beginPath();
                ctx.arc(45, 45, 90, Math.PI, Math.PI / 2 * 3);
                ctx.arc(45, 45, 60, Math.PI / 2 * 3, Math.PI, true);
                ctx.fill();
                ctx.fillStyle = border;
                ctx.beginPath(); ctx.arc(45, 45, 88, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.beginPath(); ctx.arc(45, 45, 62, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.strokeStyle = yellow;
                ctx.beginPath(); ctx.arc(45, 45, 66, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.beginPath(); ctx.arc(45, 45, 84, Math.PI, Math.PI / 2 * 3); ctx.stroke();
            }
            else if (id == 130) {
                ctx.fillStyle = road; ctx.fillRect(0, 0, 15, 15);
            }
            else if (id == 10 || id == 122) {
                ctx.strokeStyle = road; ctx.beginPath();
                ctx.arc(15, -15, 30, Math.PI / 2, Math.PI); ctx.stroke();
            }
            else if (id == 11 || id == 9 || id == 149) {
                ctx.fillStyle = road; ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = platformEdge; ctx.fillRect(-15, -15, 4, 30);
                ctx.fillRect(11, -15, 4, 30); ctx.fillRect(-15, 11, 30, 4);
                ctx.fillStyle = yellow; ctx.fillRect(-15, -15, 30, 1); ctx.fillRect(14, -15, 1, 30); ctx.fillRect(-15, 14, 30, 1);
            }
            else if (id == 12 || id == 71) {
                ctx.fillStyle = road; ctx.fillRect(-15, -2, 30, 4);
            }
            else if (id == 13 || id == 14) {
                ctx.fillStyle = road; ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = platformEdge; ctx.fillRect(-15, -15, 4, 30);
                ctx.fillRect(11, -15, 4, 30); ctx.fillRect(-15, -15, 30, 4);
                ctx.fillRect(-15, 11, 30, 4); ctx.fillStyle = yellow;
                ctx.fillRect(-15, -15, 30, 1); ctx.fillRect(-15, 14, 30, 1);
            }
            else if (id == 15 || id == 16) {
                ctx.fillStyle = road; ctx.fillRect(-15, -15, 30, 45);
                ctx.fillStyle = platformEdge; ctx.fillRect(-15, -15, 4, 45);
                ctx.fillRect(11, -15, 4, 45); ctx.fillRect(-15, -15, 30, 4);
                ctx.fillRect(-15, 11, 30, 4); ctx.fillStyle = yellow;
            }
            else if (id == 17 || id == 23 || id == 25) {
                ctx.fillStyle = road; ctx.fillRect(-15, -15, 30, 45);
                ctx.fillStyle = border; ctx.fillRect(-15, -15, 4, 45);
                ctx.fillRect(11, -15, 4, 45); ctx.fillStyle = yellow;
                ctx.fillRect(-11, -15, 4, 45); ctx.fillRect(7, -15, 4, 45);
            }
            else if (id == 18 || id == 61 || id == 60 || id == 131 || id == 132) {
                ctx.fillStyle = road; ctx.fillRect(-15, -45, 30, 90);
                ctx.fillStyle = border; ctx.fillRect(-15, -45, 4, 90);
                ctx.fillRect(11, -45, 4, 90); ctx.fillStyle = yellow;
                ctx.fillRect(-11, -45, 4, 90); ctx.fillRect(7, -45, 4, 90);
            }
            else if (id == 20 || id == 21 || id == 48 || id == 47 || id == 131 || id == 132) {
                // Straight Transitions & Transition Left/Right Down (131, 132)
                ctx.fillStyle = white; ctx.fillRect(-15, -2, 30, 4);
            }
            else if (id == 22) {
                ctx.fillStyle = road; ctx.fillRect(-15, -67.5, 30, 135);
                ctx.fillStyle = border; ctx.fillRect(-15, -67.5, 4, 135);
                ctx.fillRect(11, -67.5, 4, 135); ctx.fillStyle = yellow;
                ctx.fillRect(-11, -67.5, 4, 135); ctx.fillRect(7, -67.5, 4, 135);
            }
            else if (id == 26) {
                ctx.fillStyle = road; ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = border; ctx.fillRect(-15, -15, 30, 4);
                ctx.beginPath(); ctx.arc(-15, 15, 4, Math.PI / 2 * 3, 0); ctx.lineTo(-15, 15); ctx.fill();
                ctx.beginPath(); ctx.arc(15, 15, 4, Math.PI, Math.PI / 2 * 3); ctx.lineTo(15, 15); ctx.fill();
                ctx.strokeStyle = yellow; ctx.fillStyle = yellow; ctx.fillRect(-15, -11, 30, 4);
                ctx.beginPath(); ctx.arc(15, 15, 6, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.beginPath(); ctx.arc(-15, 15, 6, Math.PI / 2 * 3, 0); ctx.stroke();
            }
            else if (id == 27) {
                ctx.fillStyle = road; ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = border;
                ctx.beginPath(); ctx.arc(-15, 15, 4, Math.PI / 2 * 3, 0); ctx.lineTo(-15, 15); ctx.fill();
                ctx.beginPath(); ctx.arc(15, 15, 4, Math.PI, Math.PI / 2 * 3); ctx.lineTo(15, 15); ctx.fill();
                ctx.beginPath(); ctx.arc(-15, -15, 4, 0, Math.PI / 2); ctx.lineTo(-15, -15); ctx.fill();
                ctx.beginPath(); ctx.arc(15, -15, 4, Math.PI / 2, Math.PI); ctx.lineTo(15, -15); ctx.fill();
                ctx.strokeStyle = yellow;
                ctx.beginPath(); ctx.arc(-15, 15, 6, Math.PI / 2 * 3, 0); ctx.stroke();
                ctx.beginPath(); ctx.arc(15, 15, 6, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.beginPath(); ctx.arc(-15, -15, 6, 0, Math.PI / 2); ctx.stroke();
                ctx.beginPath(); ctx.arc(15, -15, 6, Math.PI / 2, Math.PI); ctx.stroke();
            }
            else if (id == 28) {
                ctx.strokeStyle = border;
                ctx.beginPath(); ctx.arc(45, 30, 58, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.beginPath(); ctx.arc(45, 30, 32, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.beginPath(); ctx.arc(-45, 30, 58, Math.PI / 2 * 3, 0); ctx.stroke();
                ctx.beginPath(); ctx.arc(-45, 30, 32, Math.PI / 2 * 3, 0); ctx.stroke();
                ctx.strokeStyle = yellow;
                ctx.beginPath(); ctx.arc(45, 30, 36, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.beginPath(); ctx.arc(45, 30, 54, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.beginPath(); ctx.arc(-45, 30, 36, Math.PI / 2 * 3, 0); ctx.stroke();
                ctx.beginPath(); ctx.arc(-45, 30, 54, Math.PI / 2 * 3, 0); ctx.stroke();
                ctx.fillStyle = road;
                ctx.beginPath(); ctx.arc(-45, 30, 52, Math.PI / 2 * 3, 0); ctx.arc(-45, 30, 38, 0, Math.PI / 2 * 3, true); ctx.fill();
                ctx.beginPath(); ctx.arc(45, 30, 52, Math.PI, Math.PI / 2 * 3); ctx.arc(45, 30, 38, Math.PI / 2 * 3, Math.PI, true); ctx.fill();
            }
            else if (id == 29 || id == 37) {
                ctx.fillStyle = roadPlatform; ctx.fillRect(-15, -15, 30, 30);
            }
            else if (id == 30) {
                ctx.fillStyle = roadPlatform;
                ctx.beginPath(); ctx.arc(15, 15, 30, Math.PI, Math.PI / 2 * 3); ctx.lineTo(15, 15); ctx.fill();
                ctx.fillStyle = border; ctx.beginPath(); ctx.arc(15, 15, 28, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.strokeStyle = blue; ctx.beginPath(); ctx.arc(15, 15, 24, Math.PI, Math.PI / 2 * 3); ctx.stroke();
            }
            else if (id == 31) {
                ctx.fillStyle = roadPlatform;
                ctx.beginPath(); ctx.arc(-30, -30, 30, 0, Math.PI / 2); ctx.lineTo(0, 0); ctx.fill();
                ctx.fillRect(-30, 0, 30, 30); ctx.fillRect(0, -30, 30, 30);
                ctx.fillStyle = border; ctx.beginPath(); ctx.arc(-30, -30, 32, 0, Math.PI / 2); ctx.stroke();
                ctx.strokeStyle = blue; ctx.beginPath(); ctx.arc(-30, -30, 36, 0, Math.PI / 2); ctx.stroke();
            }
            else if (id == 32 || id == 34) {
                ctx.fillStyle = roadPlatform; ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = border; ctx.fillRect(-15, -15, 4, 30);
                ctx.fillStyle = blue; ctx.fillRect(-11, -15, 4, 30);
            }
            else if (id == 33 || id == 35) {
                ctx.fillStyle = roadPlatform; ctx.fillRect(-15, -22.5, 30, 45);
                ctx.fillStyle = border; ctx.fillRect(-15, -22.5, 4, 45);
                ctx.fillStyle = blue; ctx.fillRect(-11, -22.5, 4, 45);
            }
            else if (id == 36 || id == 38) {
                ctx.fillStyle = roadPlatform; ctx.fillRect(-15, -22.5, 30, 45);
            }
            else if (id == 39 || id == 41) {
                ctx.fillStyle = roadPlatform; ctx.fillRect(-15, -22.5, 30, 45);
                ctx.fillStyle = border; ctx.fillRect(11, -22.5, 4, 45);
                ctx.fillStyle = blue; ctx.fillRect(7, -22.5, 4, 45);
            }
            else if (id == 40) {
                ctx.fillStyle = roadPlatform; ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = border; ctx.fillRect(11, -15, 4, 30);
                ctx.fillStyle = blue; ctx.fillRect(7, -15, 4, 30);
            }
            else if (id == 42) {
                ctx.fillStyle = road; ctx.fillRect(-15, -15, 30, 15);
                ctx.fillStyle = border; ctx.fillRect(-15, -15, 4, 15);
                ctx.fillRect(11, -15, 4, 15); ctx.fillStyle = yellow;
                ctx.fillRect(-11, -15, 4, 15); ctx.fillRect(7, -15, 4, 15);
            }
            else if (id == 54 || id == 76 || id == 63 || id == 80 || id == 78) {
                ctx.fillStyle = road; ctx.beginPath();
                ctx.arc(-45, 45, 90, Math.PI / 2 * 3, 0); ctx.arc(-45, 45, 60, 0, Math.PI / 2 * 3, true); ctx.fill();
                ctx.fillStyle = border; ctx.beginPath(); ctx.arc(-45, 45, 88, Math.PI / 2 * 3, 0); ctx.stroke();
                ctx.beginPath(); ctx.arc(-45, 45, 62, Math.PI / 2 * 3, 0); ctx.stroke();
                ctx.strokeStyle = yellow; ctx.beginPath(); ctx.arc(-45, 45, 66, Math.PI / 2 * 3, 0); ctx.stroke();
                ctx.beginPath(); ctx.arc(-45, 45, 84, Math.PI / 2 * 3, 0); ctx.stroke();
            }
            else if (id == 59) {
                ctx.fillStyle = road; ctx.beginPath();
                ctx.arc(-30, 30, 60, Math.PI / 2 * 3, 0); ctx.arc(-30, 30, 30, 0, Math.PI / 2 * 3, true); ctx.fill();
                ctx.fillStyle = border; ctx.beginPath(); ctx.arc(-30, 30, 58, Math.PI / 2 * 3, 0); ctx.stroke();
                ctx.beginPath(); ctx.arc(-30, 30, 32, Math.PI / 2 * 3, 0); ctx.stroke();
                ctx.strokeStyle = yellow; ctx.beginPath(); ctx.arc(-30, 30, 36, Math.PI / 2 * 3, 0); ctx.stroke();
                ctx.beginPath(); ctx.arc(-30, 30, 54, Math.PI / 2 * 3, 0); ctx.stroke();
            }
            else if (id == 64) {
                ctx.fillStyle = road; ctx.beginPath();
                this.sineWave(-15, 15, 15, 30, true); ctx.lineTo(15, 15);
                this.sineWave(15, 15, 15, 30, true); ctx.lineTo(0, -15); ctx.fill();
                ctx.strokeStyle = border; ctx.beginPath(); this.sineWave(-13, 15, 15, 30, true); ctx.stroke();
                ctx.beginPath(); this.sineWave(13, 15, 15, 30, true); ctx.stroke();
                ctx.strokeStyle = yellow; ctx.beginPath(); this.sineWave(-9, 15, 15, 30, true); ctx.stroke();
                ctx.beginPath(); this.sineWave(9, 15, 15, 30, true); ctx.stroke();
            }
            else if (id == 65) {
                ctx.fillStyle = road; ctx.beginPath();
                this.sineWave(-30, -15, 15, 30, false); ctx.lineTo(0, -15);
                this.sineWave(0, -15, 15, 30, false); ctx.lineTo(-15, 15); ctx.fill();
                ctx.strokeStyle = border; ctx.beginPath(); this.sineWave(-28, -15, 15, 30, false); ctx.stroke();
                ctx.beginPath(); this.sineWave(-2, -15, 15, 30, false); ctx.stroke();
                ctx.strokeStyle = yellow; ctx.beginPath(); this.sineWave(-24, -15, 15, 30, false); ctx.stroke();
                ctx.beginPath(); this.sineWave(-6, -15, 15, 30, false); ctx.stroke();
            }
            else if (id == 66) {
                ctx.fillStyle = road; ctx.beginPath();
                this.sineWave(-30, 30, 30, 60, true); ctx.lineTo(30, -30);
                this.sineWave(0, 30, 30, 60, true); ctx.lineTo(-30, 30); ctx.fill();
                ctx.strokeStyle = border; ctx.beginPath(); this.sineWave(-28, 30, 30, 60, true); ctx.stroke();
                ctx.beginPath(); this.sineWave(-2, 30, 30, 60, true); ctx.stroke();
                ctx.strokeStyle = yellow; ctx.beginPath(); this.sineWave(-24, 30, 30, 60, true); ctx.stroke();
                ctx.beginPath(); this.sineWave(-6, 30, 30, 60, true); ctx.stroke();
            }
            else if (id == 67) {
                ctx.fillStyle = road; ctx.beginPath();
                this.sineWave(-30, -30, 30, 60, false); ctx.lineTo(30, 30);
                this.sineWave(0, -30, 30, 60, false); ctx.lineTo(-30, -30); ctx.fill();
                ctx.strokeStyle = border; ctx.beginPath(); this.sineWave(-28, -30, 30, 60, false); ctx.stroke();
                ctx.beginPath(); this.sineWave(-2, -30, 30, 60, false); ctx.stroke();
                ctx.strokeStyle = yellow; ctx.beginPath(); this.sineWave(-24, -30, 30, 60, false); ctx.stroke();
                ctx.beginPath(); this.sineWave(-6, -30, 30, 60, false); ctx.stroke();
            }
            else if (id == 68) {
                ctx.fillStyle = road; ctx.beginPath();
                this.sineWave(-45, 45, 60, 90, true); ctx.lineTo(45, -45);
                this.sineWave(-15, 45, 60, 90, true); ctx.lineTo(-45, 45); ctx.fill();
                ctx.strokeStyle = border; ctx.beginPath(); this.sineWave(-43, 45, 60, 90, true); ctx.stroke();
                ctx.beginPath(); this.sineWave(-17, 45, 60, 90, true); ctx.stroke();
                ctx.strokeStyle = yellow; ctx.beginPath(); this.sineWave(-39, 45, 60, 90, true); ctx.stroke();
                ctx.beginPath(); this.sineWave(-21, 45, 60, 90, true); ctx.stroke();
            }
            else if (id == 69) {
                ctx.fillStyle = road; ctx.beginPath();
                this.sineWave(-45, -45, 60, 90, false); ctx.lineTo(45, 45);
                this.sineWave(-15, -45, 60, 90, false); ctx.lineTo(-45, -45); ctx.fill();
                ctx.strokeStyle = border; ctx.beginPath(); this.sineWave(-43, -45, 60, 90, false); ctx.stroke();
                ctx.beginPath(); this.sineWave(-17, -45, 60, 90, false); ctx.stroke();
                ctx.strokeStyle = yellow; ctx.beginPath(); this.sineWave(-39, -45, 60, 90, false); ctx.stroke();
                ctx.beginPath(); this.sineWave(-21, -45, 60, 90, false); ctx.stroke();
            }
            else if (id == 70 || id == 43 || id == 104 || id == 106) {
                ctx.fillStyle = road; ctx.fillRect(-15, 0, 30, 15);
                ctx.fillStyle = platformEdge; ctx.fillRect(-15, 0, 4, 15);
                ctx.fillRect(11, 0, 4, 15); ctx.fillRect(-15, 0, 30, 4);
                ctx.fillRect(-15, 11, 30, 4); ctx.fillStyle = yellow;
                ctx.fillRect(-15, 0, 1, 15); ctx.fillRect(14, 0, 1, 15);
                ctx.fillRect(-15, 0, 30, 1); ctx.fillRect(-15, 14, 30, 1);
            }
            else if (id == 72 || id == 117) {
                ctx.fillStyle = platformEdge; ctx.fillRect(0, -2, 15, 4);
            }
            else if (id == 73) {
                ctx.fillStyle = roadPlatform; ctx.fillRect(-15, -15, 30, 15);
            }
            else if (id == 74) {
                ctx.fillStyle = roadPlatform; ctx.fillRect(-15, -15, 30, 15);
                ctx.fillStyle = border; ctx.fillRect(-15, -15, 4, 15);
                ctx.fillStyle = blue; ctx.fillRect(-11, -15, 4, 15);
            }
            else if (id == 81) {
                ctx.fillStyle = white; ctx.fillRect(-3, -15, 6, 30);
                ctx.fillStyle = border; ctx.fillRect(-3, -15, 6, 1); ctx.fillRect(-3, 14, 6, 1);
            }
            else if (id == 82 || id == 90) {
                ctx.fillStyle = white; ctx.fillRect(-3, -15, 6, 15);
                ctx.fillStyle = border; ctx.fillRect(-3, -15, 6, 1); ctx.fillRect(-3, -1, 6, 1);
            }
            else if (id == 83 || id == 84) {
                ctx.fillStyle = border; ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
            }
            else if (id == 85) {
                ctx.fillStyle = white; ctx.beginPath(); ctx.arc(15, 0, 12, Math.PI, Math.PI / 2 * 3);
                ctx.arc(15, 0, 18, Math.PI / 2 * 3, Math.PI, true); ctx.fill();
                ctx.fillStyle = border; ctx.fillRect(-3, 0, 6, 1); ctx.fillRect(14, -18, 1, 6);
            }
            else if (id == 86) {
                ctx.fillStyle = white; ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI);
                ctx.lineTo(-3, -15); ctx.lineTo(3, -15); ctx.fill();
                ctx.fillStyle = border; ctx.fillRect(-3, -15, 6, 1);
            }
            else if (id == 87) {
                ctx.fillStyle = white; ctx.fillRect(-3, -15, 6, 15);
                ctx.fillStyle = border; ctx.fillRect(-3, -1, 6, 1);
                ctx.beginPath(); ctx.arc(0, -15, 3.5, 0, Math.PI * 2); ctx.fill();
            }
            else if (id == 88) {
                ctx.fillStyle = white; ctx.fillRect(-3, -15, 6, 30); ctx.fillRect(-15, -3, 30, 6);
                ctx.fillStyle = border; ctx.fillRect(-3, -15, 6, 1); ctx.fillRect(-3, 14, 6, 1);
                ctx.fillRect(14, -3, 1, 6); ctx.fillRect(-15, -3, 1, 6); ctx.fillRect(-3, -3, 6, 6);
            }
            else if (id == 89) {
                ctx.fillStyle = white; ctx.fillRect(-15, -3, 30, 6);
                ctx.fillStyle = border; ctx.fillRect(14, -3, 1, 6); ctx.fillRect(-15, -3, 1, 6);
                ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
            }
            else if (id == 91) {
                ctx.fillStyle = tube; ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = border; ctx.fillRect(-15, -15, 30, 1); ctx.fillRect(-15, 13, 30, 1);
            }
            else if (id == 92) {
                ctx.fillStyle = tube; ctx.fillRect(-15, -15, 30, 15);
                ctx.fillStyle = border; ctx.fillRect(-15, -15, 30, 1); ctx.fillRect(-15, -1, 30, 1);
            }
            else if (id == 93 || id == 94) {
                ctx.lineWidth = 1; ctx.strokeStyle = border;
                ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.stroke();
            }
            else if (id == 95) {
                ctx.fillStyle = tube; ctx.beginPath();
                ctx.arc(30, 30, 60, Math.PI, Math.PI / 2 * 3); ctx.arc(30, 30, 30, Math.PI / 2 * 3, Math.PI, true); ctx.fill();
                ctx.fillStyle = border; ctx.fillRect(-30, 29, 30, 1); ctx.fillRect(30, -30, 1, 30);
            }
            else if (id == 96 || id == 97) {
                ctx.strokeStyle = border; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = tube; ctx.beginPath(); ctx.arc(0, 0, 15, Math.PI, 0); ctx.lineTo(15, -45);
                ctx.lineTo(-15, -45); ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI);
                ctx.lineTo(-15, -45); ctx.lineTo(15, -45); ctx.fill();
                ctx.fillStyle = border; ctx.fillRect(-15, -45, 30, 1);
            }
            else if (id == 98) {
                ctx.fillStyle = lightgrass; ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = darkgrass; ctx.fillRect(-15, -15, 15, 15); ctx.fillRect(0, 0, 15, 15);
            }
            else if (id == 101) {
                ctx.fillStyle = tree;
                ctx.fillRect(-11, -11, 7, 7); ctx.fillRect(-11, 4, 7, 7);
                ctx.fillRect(4, -11, 7, 7); ctx.fillRect(4, 4, 7, 7);
            }
            else if (id == 103) {
                ctx.fillStyle = tree; ctx.fillRect(4, -11, 7, 7);
            }
            else if (id == 144) {
                ctx.fillStyle = road; ctx.fillRect(-15, -15, 15, 15);
            }

            // Curve 2 Thin Lines: 1x1 (105, 119 -> 15px) & 3x3 (112, 125 -> 45px)
            else if (id == 105 || id == 119) {
                ctx.strokeStyle = road;
                ctx.beginPath();
                ctx.arc(0, 0, 15, Math.PI / 2, Math.PI);
                ctx.stroke();
            }
            else if (id == 112 || id == 125) {
                ctx.strokeStyle = road;
                ctx.beginPath();
                ctx.arc(30, -30, 45, Math.PI / 2, Math.PI);
                ctx.stroke();
            }

            // 1x1 Standard Curves (104, 106 -> 15px outer radius)
            else if (id == 104 || id == 106) {
                ctx.fillStyle = road; ctx.fillRect(-15, -15, 15, 15);
                ctx.fillStyle = roadPlatform; ctx.fillRect(-12.5, -12.5, 12.5, 12.5)
            }

            // 1x1 Pieces
            else if (id == 118 || id == 120 || id == 116 || id == 145) {
                ctx.fillStyle = road; ctx.fillRect(0, 0, 15, 15);
                ctx.fillStyle = roadPlatform; ctx.fillRect(2.5, 2.5, 10, 10)
            }

            // 3x3 Standard Curves (111, 113,)
            else if (id == 111 || id == 113) {
                ctx.fillStyle = road;
                ctx.fillRect(-15, -30, 30, 45);
                
                ctx.fillStyle = platformEdge;
                ctx.fillRect(-15, -30, 30, 4);
                ctx.fillRect(-15, 11, 30, 4);
                
                ctx.fillStyle = yellow;
                ctx.fillRect(-15, -30, 30, 1);
                ctx.fillRect(-15, 14, 30, 1);
            }

            // 3x3 Narrow Curves (124, 126 -> 45px outer, 30px inner)
            else if (id == 124 || id == 126 || id == 127 || id == 129) {
                ctx.fillStyle = road;
                ctx.fillRect(0, -30, 15, 45);
                
                ctx.fillStyle = platformEdge;
                ctx.fillRect(0, -30, 15, 4);
                ctx.fillRect(0, 11, 15, 4);
                
                ctx.fillStyle = yellow;
                ctx.fillRect(0, -30, 15, 1);
                ctx.fillRect(0, 14, 15, 1);
            }

            // 3x3 Curve Corners
            else if ( id == 114 || id == 115) {
                ctx.fillStyle = road;
                ctx.beginPath();
                ctx.moveTo(-15, -30);
                ctx.arc(-15, -30, 45, 0, Math.PI / 2);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = border;
                ctx.beginPath();
                ctx.moveTo(-15, -30);
                ctx.arc(-15, -30, 45, 0, Math.PI / 2);
                ctx.closePath();
                ctx.stroke();
                ctx.fillStyle = roadPlatform;
                ctx.beginPath();
                ctx.moveTo(-7.5, -22.5);
                ctx.arc(-7.5, -22.5, 30, 0, Math.PI / 2);
                ctx.closePath();
                ctx.fill();
            }

            // 1x1 Curve Corners (107 & 108)
            else if ( id == 107 || id == 108 || id == 146) {
                if (id == 146) {
                    ctx.rotate(Math.PI * 3 / 2);
                }
                ctx.fillStyle = road;
                ctx.beginPath();
                ctx.moveTo(-15, 0);
                ctx.arc(-15, 0, 15, 0, Math.PI / 2);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = border;
                ctx.beginPath();
                ctx.moveTo(-15, 0);
                ctx.arc(-15, 0, 15, 0, Math.PI / 2);
                ctx.closePath();
                ctx.stroke();
                ctx.fillStyle = roadPlatform;
                ctx.beginPath();
                ctx.moveTo(-12.5, 2.5);
                ctx.arc(-12.5, 2.5, 10, 0, Math.PI / 2);
                ctx.closePath();
                ctx.fill();
            }

            // 2x2 Curve Corners (107 & 108) and Big Grass Ramp Outer Corners (151)
            else if ( id == 109 || id == 110 || id == 151) {
                ctx.fillStyle = road;
                ctx.beginPath();
                ctx.moveTo(-15, -15);
                ctx.arc(-15, -15, 30, 0, Math.PI / 2);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = border;
                ctx.beginPath();
                ctx.moveTo(-15, -15);
                ctx.arc(-15, -15, 30, 0, Math.PI / 2);
                ctx.closePath();
                ctx.stroke();
                ctx.fillStyle = roadPlatform;
                ctx.beginPath();
                ctx.moveTo(-12.5, -12.5);
                ctx.arc(-12.5, -12.5, 25, 0, Math.PI / 2);
                ctx.closePath();
                ctx.fill();
            }
            else if (id == 121 || id == 128 || id == 123 || id == 150) {
                ctx.fillStyle = road; ctx.fillRect(0, -15, 15, 30);
                ctx.fillStyle = platformEdge; ctx.fillRect(0, -15, 15, 4);
                ctx.fillRect(0, 11, 15, 4); ctx.fillRect(0, -15, 4, 30);
                ctx.fillRect(11, -15, 3, 30); ctx.fillStyle = yellow;
                ctx.fillRect(0, -15, 15, 1); ctx.fillRect(0, 14, 14, 1);
                ctx.fillRect(0, -15, 1, 30); ctx.fillRect(14, -15, 1, 30);
            }
            else if (id == 140 || id == 141 || id == 142 || id == 143) {
                ctx.fillStyle = road;
                ctx.beginPath();
                if (id == 140) {
                    ctx.moveTo(15, 15); ctx.lineTo(-15, 15);
                    ctx.arc(15, 15, 30, Math.PI, Math.PI * 1.5);
                } else if (id == 141) {
                    ctx.moveTo(-15, 15); ctx.lineTo(-15, -15);
                    ctx.arc(-15, 15, 30, Math.PI * 1.5, 0);
                } else if (id == 142) {
                    ctx.moveTo(15, -15); ctx.lineTo(15, 15);
                    ctx.arc(15, -15, 30, Math.PI * 0.5, Math.PI);
                } else {
                    ctx.moveTo(-15, -15); ctx.lineTo(15, -15);
                    ctx.arc(-15, -15, 30, 0, Math.PI * 0.5);
                }
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = blue;
                ctx.lineWidth = 3;
                ctx.beginPath();
                if (id == 140) ctx.arc(15, 15, 28.5, Math.PI, Math.PI * 1.5);
                else if (id == 141) ctx.arc(-15, 15, 28.5, Math.PI * 1.5, 0);
                else if (id == 142) ctx.arc(15, -15, 28.5, Math.PI * 0.5, Math.PI);
                else ctx.arc(-15, -15, 28.5, 0, Math.PI * 0.5);
                ctx.stroke();
                ctx.lineWidth = 1;
            }

            // Slope Borders: Top (154) & Bottom (155) -> 30x30
            else if (id == 154 || id == 155) {
                ctx.fillStyle = road;
                ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = blue;
                if (id == 154) ctx.fillRect(-15, -15, 30, 4);
                else ctx.fillRect(-15, 11, 30, 4);
            }
            else if (id == 147) {
                ctx.fillStyle = road;
                ctx.fillRect(0, 0, 15, 15);
                ctx.fillStyle = border;
                ctx.fillRect(0, 13.5, 15, 1.5);
                ctx.fillStyle = yellow;
                ctx.beginPath();
                ctx.moveTo(1.5, 0);
                ctx.lineTo(15, 0);
                ctx.lineTo(15, 13.5);
                ctx.arc(15, 0, 13.5, Math.PI / 2, Math.PI);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = roadPlatform;
                ctx.beginPath();
                ctx.moveTo(3, 1.5);
                ctx.lineTo(13.5, 1.5);
                ctx.lineTo(13.5, 12);
                ctx.arc(15, 0, 12, Math.PI / 2, Math.PI);
                ctx.closePath();
                ctx.fill();
            }
            // 148: Grass Ramp Inner Corner Large
            else if (id == 148) {
                ctx.fillStyle = road;
                ctx.beginPath();
                ctx.moveTo(-15, -15);
                ctx.lineTo(0, -15);
                ctx.arc(15, -15, 15, Math.PI, Math.PI / 2, true);
                ctx.lineTo(15, 15);
                ctx.lineTo(-15, 15);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = border;
                ctx.fillRect(-15, 13.5, 30, 1.5);
                ctx.fillStyle = yellow;
                ctx.beginPath();
                ctx.arc(15, -15, 30, Math.PI / 2, Math.PI);
                ctx.arc(15, -15, 15, Math.PI, Math.PI / 2, true);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = roadPlatform;
                ctx.beginPath();
                ctx.arc(15, -15, 28, Math.PI / 2 + 0.06, Math.PI - 0.06);
                ctx.arc(15, -15, 17, Math.PI - 0.06, Math.PI / 2 + 0.06, true);
                ctx.closePath();
                ctx.fill();
            }
            else if (id == 158) {
                ctx.fillStyle = ice;
                ctx.fillRect(-15, -15, 30, 30);
            }
            else if (id == 159) {
                ctx.fillStyle = dirt;
                ctx.fillRect(-15, -15, 30, 30);
            }
            else if (id == 153 || id == 157) {
                this.drawPoolPiece(p, id == 153);
            }

            else {
                ctx.fillStyle = road;
                ctx.fillRect(-15, -15, 30, 30);
            }
        }

        render(px, pz, pr) {
            const ctx = this.ctx;
            ctx.clearRect(0, 0, 1500, 1500);
            
            if (!this.trackPieces || this.trackPieces.length === 0) return;
        
            this.buildPoolSet();
            const sortedPieces = [...this.trackPieces].sort((a, b) => a.p[1] - b.p[1]);
        
            ctx.save();
            ctx.translate(750, 750); 
        
            sortedPieces.forEach(p => {
                ctx.save();
                ctx.translate(p.p[0], -p.p[2]); 
                ctx.rotate((p.r || 0) * Math.PI / 180);
                this.drawPieceAtOrigin(p);
                ctx.restore();
            }); 

            this.ghosts.forEach((ghost, index) => {
                const colors = ["#00ffff", "#ff00ff", "#ffff00"]; 
                const color = colors[index % colors.length];
            
                ctx.save();
                
                ctx.shadowBlur = 20;
                ctx.shadowColor = color;
                ctx.strokeStyle = color;
                ctx.lineWidth = 6;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.globalAlpha = 0.8;
            
                ctx.beginPath();
                ghost.points.forEach((point, i) => {
                    const x = point.x;
                    const z = -point.z; 
                    if (i === 0) {
                        ctx.moveTo(x, z);
                    } else {
                        ctx.lineTo(x, z);
                    }
                });
                ctx.stroke();
            
                ctx.restore();
            });
            ctx.save();
            ctx.translate(px, -pz);
            ctx.rotate((pr || 0) * Math.PI / 180);
            ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
            ctx.shadowBlur = 12;

            ctx.beginPath();
            ctx.arc(0, 0, 26, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 59, 48, 0.28)";
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
            ctx.stroke();
            ctx.fillStyle = "#ff3b30";
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 4;
            ctx.lineJoin = "round";

            ctx.beginPath();
            ctx.moveTo(0, -28);
            ctx.lineTo(20, 18); 
            ctx.lineTo(0, 8);
            ctx.lineTo(-20, 18);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.restore();
            ctx.restore();
        }
    }

    const ensureUI = () => {
        let container = document.getElementById('dashmap-container');
        let canvas = document.getElementById('dashmap-canvas');
    
        if (!container) {
            container = document.createElement('div');
            container.id = 'dashmap-container';
            Object.assign(container.style, {
                position: 'fixed', bottom: '10px', left: '10px',
                width: '300px', height: '300px', zIndex: '2147483647',
                background: 'rgba(0, 0, 0, 0.7)', borderRadius: '15px',
                border: '2px solid white', overflow: 'hidden'
            });
    
            canvas = document.createElement('canvas');
            canvas.id = 'dashmap-canvas';
            canvas.width = 1500; canvas.height = 1500;
            Object.assign(canvas.style, {
                width: '100%', height: '100%', pointerEvents: 'none'
            });
    
            const closeBtn = document.createElement('div');
            closeBtn.innerText = '✕';
            Object.assign(closeBtn.style, {
                position: 'absolute', top: '5px', right: '10px',
                color: 'white', cursor: 'pointer', fontSize: '20px',
                fontWeight: 'bold', zIndex: '2147483648', pointerEvents: 'auto'
            });
    
            closeBtn.onclick = () => {
                isManuallyClosed = true;
                container.style.display = 'none';
            };
    
            container.appendChild(closeBtn);
            container.appendChild(canvas);
            document.body.appendChild(container);
            mapInstance = new DashMinimap(canvas);
        }
    
        container.style.display = (isRaceActive && !isManuallyClosed) ? 'block' : 'none';
    };

    let readyInterval = null;
    let lastPos = { x: 0, z: 0, r: 0 };

    window.addEventListener("message", (e) => {
        if (e.data.type === 'DASH_TRACK_DATA') {
            isRaceActive = true;
            isManuallyClosed = false;
            ensureUI();
            if (mapInstance) {
                const pieces = e.data.data.trackPieces || [];
                mapInstance.trackPieces = pieces;
                mapInstance.ghosts = [];
                const startPiece = pieces.find(p => p.id === 1);
                if (startPiece) {
                    lastPos = {
                        x: startPiece.p[0],
                        z: startPiece.p[2],
                        r: startPiece.r || 0
                    };
                } else {
                    lastPos = { x: 0, z: 0, r: 0 };
                }

                mapInstance.render(lastPos.x, lastPos.z, lastPos.r); 
            }
        }
    
        if (e.data.type === 'DASH_ADD_GHOST') {
            if (mapInstance) {
                mapInstance.ghosts.push({
                    username: e.data.username,
                    points: e.data.points
                });
                mapInstance.render(lastPos.x, lastPos.z, lastPos.r); 
            }
        }

        if (e.data.type === 'DASH_UPDATE_POS') {
            lastPos = { x: e.data.x, z: e.data.z, r: e.data.r };
            if (mapInstance && isRaceActive && !isManuallyClosed) {
                mapInstance.render(lastPos.x, lastPos.z, lastPos.r);
            }
        }
    });

    readyInterval = setInterval(() => {
        if (!isRaceActive) {
            window.postMessage({ type: 'DASH_READY' }, "*");
        }
    }, 1000);

    setInterval(() => {
        ensureUI();
        if (isRaceActive && !isManuallyClosed && mapInstance) {
            // Re-render using the player's last known position instead of (0, 0, 0)
            mapInstance.render(lastPos.x, lastPos.z, lastPos.r);
        }
    }, 1000);
})();