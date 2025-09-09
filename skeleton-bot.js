/* global bots */

/*
 * ===================================================================
 *                    BITS ARENA - ROBOT SKELETON V1
 * ===================================================================
 *
 * Simplified strategy focusing on core mechanics:
 * - Predictive bullet dodging with time-to-impact
 * - Fixed-distance kiting (50%-85% of range)
 * - Basic wall avoidance
 * - Direct shooting when in range
 * 
 * Recommended stats:
 * ⚡ Speed 5
 * ⚔️ Strength 2
 * 🛡️ Health 3
 * 🎯 Range 5
 * ===================================================================
 */

bots.push({
    action(world) {
        const action = {
            moveDirection: null,
            shoot: undefined,
            shield: false,
        };

        const self = world.self;
        const enemies = world.enemies;
        const bullets = world.bullets;

        const centerX = world.map.x + world.map.width / 2;
        const centerY = world.map.y + world.map.height / 2;

        // Memory for aggressive counter-attack
        if (!this._memory) {
            this._memory = { lastDodgeTick: -1 };
        }
        const mem = this._memory;

        function normalizeAngle(a) {
            while (a > Math.PI) a -= Math.PI * 2;
            while (a < -Math.PI) a += Math.PI * 2;
            return a;
        }

        // 1) Simple single bullet dodging
        if (bullets.length > 0) {
            const b = bullets[0]; // Only one bullet exists
            const timeThreshold = 30 + Math.max(0, 8 - self.stats.speed) * 2;
            
            // Calculate if bullet will hit us
            const bs = b.speed || Math.hypot(b.vx, b.vy) || 0.0001;
            const ux = b.vx / bs; // bullet direction
            const uy = b.vy / bs;
            const rx = self.x - b.x; // vector from bullet to us
            const ry = self.y - b.y;
            const along = rx * ux + ry * uy; // how far along bullet path we are
            
            if (along > 0) { // bullet coming toward us
                const px = rx - ux * along; // perpendicular offset
                const py = ry - uy * along;
                const perpDist = Math.hypot(px, py);
                const tti = along / bs; // time to impact
                
                // Dodge if bullet will pass close and soon
                if (perpDist < 70 && tti < timeThreshold) {
                    const bulletAngle = Math.atan2(b.vy, b.vx);
                    const dodgeA = bulletAngle + Math.PI / 2;
                    const dodgeB = bulletAngle - Math.PI / 2;
                    
                    // Pick dodge direction toward center
                    const angleToCenter = Math.atan2(centerY - self.y, centerX - self.x);
                    const diffA = Math.abs(normalizeAngle(dodgeA - angleToCenter));
                    const diffB = Math.abs(normalizeAngle(dodgeB - angleToCenter));
                    action.moveDirection = diffA <= diffB ? dodgeA : dodgeB;
                    
                    // Shield if very close
                    if (self.canShield && tti < 12) {
                        action.shield = true;
                    }
                }
            }
        }

        // 2) Target selection - just pick closest enemy
        let target = null;
        if (enemies.length > 0) {
            let closestDist = Infinity;
            for (let i = 0; i < enemies.length; i++) {
                const d = world.getDistanceToTarget(enemies[i].x, enemies[i].y);
                if (d < closestDist) {
                    closestDist = d;
                    target = enemies[i];
                }
            }
        }

        // 3) Simple shoot and bounce strategy
        if (!action.moveDirection && target) {
            const d = world.getDistanceToTarget(target.x, target.y);
            
            if (d < self.range * 0.6) {
                // Too close - run toward them to force bounce
                action.moveDirection = world.directionTo(target.x, target.y);
            } else if (d > self.range * 0.9) {
                // Too far - get in range
                action.moveDirection = world.directionTo(target.x, target.y);
            }
            // Good range (60-90%) - stand still and shoot
        }

        // 5) Shooting - only when safe and in good position
        if (target && self.canShoot) {
            const d = world.getDistanceToTarget(target.x, target.y);
            if (d <= self.range) {
                action.shoot = world.shootAt(target.x, target.y);
            }
        }

        // 6) Respect shooting animation lock
        if (self.shootingState === 'preparing' ||
            self.shootingState === 'shooting' ||
            self.shootingState === 'recovering') {
            action.moveDirection = null;
        }

        return action;
    },
});
