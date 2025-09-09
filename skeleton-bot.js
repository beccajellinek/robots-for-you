/* global bots */

/*
 * ===================================================================
 *                    BITS ARENA - ROBOT SKELETON
 * ===================================================================
 *
 * This is a comprehensive template for creating your own robot strategy.
 * Copy this file and modify the action() function to implement your bot's behavior.
 *
 * IMPORTANT:
 * - Name, emoji, color, and stats are set in the config page, not here
 * - Only the action() function matters in this file
 * - Upload this .js file in the configuration page
 *
 * ===================================================================
 */

bots.push({


    // ===============================================================
    //                        MAIN ACTION FUNCTION
    // ===============================================================

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

        // =============================================================
        //                    ACTION OBJECT TEMPLATE
        // =============================================================

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
            // shoot: undefined,       // Don't shoot
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
            // shield: false,         // Don't use shield (default)
        };

        // =============================================================
        //                    STRATEGY IMPLEMENTATION
        // =============================================================

        // EXAMPLE 1: Basic enemy tracking
        if (world.enemies.length > 0) {
            const enemy = world.enemies[0]; // Target first enemy

            // Use the getDistanceToTarget helper method
            const distance = world.getDistanceToTarget(enemy.x, enemy.y);

            // Move toward enemy using directionTo helper
            action.moveDirection = world.directionTo(enemy.x, enemy.y);

            // Shoot if in range and can shoot using shootAt helper
            if (world.self.canShoot && distance <= world.self.range) {
                action.shoot = world.shootAt(enemy.x, enemy.y);
            }
        }

        // EXAMPLE 2: Random movement when no enemies
        if (world.enemies.length === 0) {
            // Move in a random direction when there are no enemies to chase
            action.moveDirection = Math.random() * Math.PI * 2;
        }

        // EXAMPLE 3: Bullet dodging
        if (world.bullets.length > 0 && world.self.canShield) {
            const closestBullet = world.bullets.reduce(
                (closest, bullet) => {
                    const dist = world.getDistanceToTarget(bullet.x, bullet.y);
                    return dist < closest.distance
                        ? { bullet, distance: dist }
                        : closest;
                },
                { distance: Infinity },
            );

            if (closestBullet.distance < 100) {
                action.shield = true;
            }
        }

        // EXAMPLE 4: Shooting state awareness
        if (
            self.shootingState === 'preparing' ||
            self.shootingState === 'shooting'
        ) {
            // Stop while aiming for better accuracy
            action.moveDirection = null;
        }

        // =============================================================
        //                    RETURN YOUR ACTION
        // =============================================================
        return action;
    },
});
