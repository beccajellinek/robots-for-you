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
       /**
     * This function is called every game tick (~60 FPS)
     * @param {object} world - Contains all game information
     * @returns {object} action - Your robot's actions for this frame
     */
    action(world) {
           // =============================================================
        // WORLD OBJECT (deep copied, modifying won't affect the game 😉)
        // =============================================================
        /*
         * world.self = {
         *   x: number,              // Your robot's X position
         *   y: number,              // Your robot's Y position
         *   hp: number,             // Your current health points
         *   canShoot: boolean,      // Can you shoot right now?
         *   canShield: boolean,     // Can you use shield right now?
         *   shootingState: string,  // 'idle', 'preparing', 'shooting'
         *   stats: {                // Your robot's stats (from config page)
         *     speed: number,        //   1-10: Movement speed multiplier
         *     strength: number,     //   1-10: Bullet damage
         *     health: number,       //   1-10: Max HP
         *     range: number         //   1-10: Shooting range multiplier
         *   },
         *   range: number           // Actual shooting range in pixels
         * }
         *
         * world.enemies = [{       // Array of enemy robots
         *   x: number,             //   Enemy X position
         *   y: number,             //   Enemy Y position
         *   hp: number,            //   Enemy health points
         *   stats: {...}           //   Enemy stats
         * }]
         *
         * world.bullets = [{       // Array of bullets
         *   x: number,             //   Bullet X position
         *   y: number,             //   Bullet Y position
         *   vx: number,            //   Bullet X velocity
         *   vy: number,            //   Bullet Y velocity
         *   damage: number,        //   Bullet damage
         *   maxRange: number,      //   Maximum bullet range
         *   traveledDistance: number, // Distance traveled so far
         *   life: number,          //   Remaining bullet lifetime
         *   speed: number,         //   Bullet speed
         * }]
         *
         * world.map = {            // Arena boundaries
         *   width: number,         //   Arena width
         *   height: number,        //   Arena height
         *   x: number,             //   Arena left edge
         *   y: number              //   Arena top edge
         * }
         *
         * world.tick = number      // Current game time
         *
         * world.getDistanceToTarget = function(targetX, targetY)
         *                             // Helper method to calculate distance from your robot to a target
         *                             // Returns: Euclidean distance as a number
         *
         * world.shootAt = function(targetX, targetY)
         *                             // Helper method to calculate shooting angle towards a target
         *                             // Returns: Angle in radians to aim at the target
         *
         * world.directionTo = function(targetX, targetY)
         *                             // Helper method to calculate direction angle to move towards a target
         *                             // Returns: Angle in radians to move toward the target
         *
         * world.directionAwayFrom = function(targetX, targetY)
         *                             // Helper method to calculate direction angle to move away from a target
         *                             // Returns: Angle in radians to move away from the target
         */
     
        const action = {
            // MOVEMENT: angle in radians, or null to stay still
            // Examples:
            // moveDirection: null,                           // Stay still
            // moveDirection: 0,                              // Move right
            // moveDirection: Math.PI/2,                      // Move down
            // moveDirection: -Math.PI/2,                     // Move up
            // moveDirection: Math.PI,                        // Move left
            // moveDirection: world.directionTo(enemy.x, enemy.y), // Move toward target
            // moveDirection: world.directionAwayFrom(bullet.x, bullet.y), // Run away from danger
            moveDirection: null,

            // SHOOTING: angle in radians, or undefined/null to not shoot
            // Examples:
            shoot: undefined,       // Don't shoot
            // shoot: 0,              // Shoot right
            // shoot: Math.PI,        // Shoot left
            // shoot: world.shootAt(enemy.x, enemy.y), // Shoot at target
            //
            // Advanced example with distance check and shootAt helper:
            // const enemy = world.enemies[0];
            // const distance = world.getDistanceToTarget(enemy.x, enemy.y);
            // if (distance <= world.self.range) {
            //     action.shoot = world.shootAt(enemy.x, enemy.y);
            // }

            // SHIELD: boolean, activates 360-degree protection
            // shield: true,          // Activate shield
            shield: false,         // Don't use shield (default)
        };

        const self = world.self;
        const enemies = world.enemies;
        const bullets = world.bullets;

        const centerX = world.map.x + world.map.width / 2;
        const centerY = world.map.y + world.map.height / 2;

        // Memory for tracking robot state
        if (!this._memory) {
            this._memory = { 
                lastDodgeTick: -1,
                facingDirection: 0 // Track robot's facing direction
            };
        }
        const mem = this._memory;

        function normalizeAngle(a) {
            while (a > Math.PI) a -= Math.PI * 2;
            while (a < -Math.PI) a += Math.PI * 2;
            return a;
        }

        // Helper function to check if shooting angle is within 180° forward arc
        function canShootAtAngle(shootAngle, robotFacingAngle) {
            if (robotFacingAngle === undefined) return true; // If no facing direction, allow all angles
            const angleDiff = Math.abs(normalizeAngle(shootAngle - robotFacingAngle));
            return angleDiff <= Math.PI / 2; // Within ±90° of facing direction
        }

        // 1) Enhanced multi-bullet dodging system
        if (bullets.length > 0) {
            // Calculate dynamic thresholds based on robot stats and situation
            const baseTimeThreshold = 25 + Math.max(0, 8 - self.stats.speed) * 3;
            const baseDodgeDistance = 60 + self.stats.speed * 5; // Scale with speed
            const emergencyTimeThreshold = 15;
            
            // Analyze all bullets and create threat assessments
            const threats = bullets.map(bullet => {
                const bs = bullet.speed || Math.hypot(bullet.vx, bullet.vy) || 0.0001;
                const ux = bullet.vx / bs; // bullet direction unit vector
                const uy = bullet.vy / bs;
                const rx = self.x - bullet.x; // vector from bullet to robot
                const ry = self.y - bullet.y;
                const along = rx * ux + ry * uy; // how far along bullet path we are
                
                if (along <= 0) return null; // bullet not coming toward us
                
                const px = rx - ux * along; // perpendicular offset
                const py = ry - uy * along;
                const perpDist = Math.hypot(px, py);
                const tti = along / bs; // time to impact
                
                // Calculate threat score (lower = more dangerous)
                const threatScore = perpDist + (tti * 2); // closer + sooner = more dangerous
                
                return {
                    bullet,
                    perpDist,
                    tti,
                    threatScore,
                    bulletAngle: Math.atan2(bullet.vy, bullet.vx),
                    along
                };
            }).filter(t => t !== null);
            
            // Sort by threat level (most dangerous first)
            threats.sort((a, b) => a.threatScore - b.threatScore);
            
            // Find the most threatening bullet that requires dodging
            const primaryThreat = threats.find(t => 
                t.perpDist < baseDodgeDistance && t.tti < baseTimeThreshold
            );
            
            if (primaryThreat) {
                // Calculate optimal escape vector considering multiple factors
                const escapeVectors = [];
                
                // Generate multiple escape directions (180° arc for better movement)
                // Focus on directions perpendicular to bullet path for optimal dodging
                for (let angleOffset = -Math.PI/2; angleOffset <= Math.PI/2; angleOffset += Math.PI / 6) {
                    const escapeAngle = primaryThreat.bulletAngle + angleOffset;
                    const escapeX = self.x + Math.cos(escapeAngle) * 100; // 100px ahead
                    const escapeY = self.y + Math.sin(escapeAngle) * 100;
                    
                    // Check if escape direction is valid (not into walls)
                    // Arena has 30-pixel margin for robot boundaries
                    const wallBuffer = 30;
                    const isValidEscape = 
                        escapeX > world.map.x + wallBuffer &&
                        escapeX < world.map.x + world.map.width - wallBuffer &&
                        escapeY > world.map.y + wallBuffer &&
                        escapeY < world.map.y + world.map.height - wallBuffer;
                    
                    if (isValidEscape) {
                        // Calculate how well this escape avoids other threats
                        let escapeScore = 0;
                        for (const threat of threats.slice(0, 3)) { // Consider top 3 threats
                            const futureX = self.x + Math.cos(escapeAngle) * threat.tti * self.stats.speed * 10;
                            const futureY = self.y + Math.sin(escapeAngle) * threat.tti * self.stats.speed * 10;
                            const futureDist = Math.hypot(futureX - threat.bullet.x, futureY - threat.bullet.y);
                            escapeScore += futureDist; // Higher distance = better escape
                        }
                        
                        // Prefer directions toward center of arena
                        const angleToCenter = Math.atan2(centerY - self.y, centerX - self.x);
                        const centerAlignment = 1 / (1 + Math.abs(normalizeAngle(escapeAngle - angleToCenter)));
                        
                        escapeVectors.push({
                            angle: escapeAngle,
                            score: escapeScore + centerAlignment * 50
                        });
                    }
                }
                
                // Pick the best escape direction
                if (escapeVectors.length > 0) {
                    escapeVectors.sort((a, b) => b.score - a.score);
                    action.moveDirection = escapeVectors[0].angle;
                    
                    // Use shield for emergency situations
                    if (self.canShield && primaryThreat.tti < emergencyTimeThreshold) {
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

        // 3) Strategic positioning considering shooting constraints
        if (!action.moveDirection && target) {
            const d = world.getDistanceToTarget(target.x, target.y);
            const targetAngle = world.directionTo(target.x, target.y);
            const shootAngle = world.shootAt(target.x, target.y);
            
            // Check if we can currently shoot at the target
            const canShootTarget = canShootAtAngle(shootAngle, mem.facingDirection);
            
            if (d < self.range * 0.6) {
                // Too close - run toward them to force bounce
                action.moveDirection = targetAngle;
            } else if (d > self.range * 0.9) {
                // Too far - get in range
                action.moveDirection = targetAngle;
            } else if (!canShootTarget) {
                // In range but can't shoot - adjust position to face target
                // Move perpendicular to target to get better shooting angle
                const perpAngle = targetAngle + (Math.random() > 0.5 ? Math.PI/2 : -Math.PI/2);
                action.moveDirection = perpAngle;
            }
            // Good range (60-90%) and can shoot - stand still and shoot
        }

        // 5) Shooting - only when safe and in good position
        if (target && self.canShoot) {
            const d = world.getDistanceToTarget(target.x, target.y);
            if (d <= self.range) {
                const shootAngle = world.shootAt(target.x, target.y);
                // Only shoot if angle is within 180° forward arc
                if (canShootAtAngle(shootAngle, mem.facingDirection)) {
                    action.shoot = shootAngle;
                }
            }
        }

        // 6) Respect shooting animation lock
        if (self.shootingState === 'preparing' ||
            self.shootingState === 'shooting' ||
            self.shootingState === 'recovering') {
            action.moveDirection = null;
        }

        // 7) Update facing direction based on movement
        if (action.moveDirection !== null) {
            mem.facingDirection = action.moveDirection;
        }

        return action;
    },
});
