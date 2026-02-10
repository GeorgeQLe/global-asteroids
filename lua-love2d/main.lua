-- Asteroids - Complete game in LOVE 2D
-- All game logic in a single file

--------------------------------------------------------------------------------
-- Constants
--------------------------------------------------------------------------------
local CANVAS_WIDTH, CANVAS_HEIGHT = 800, 600

local SHIP_SIZE = 20
local SHIP_ROTATION_SPEED = 270 -- degrees/s
local SHIP_THRUST = 200         -- px/s^2
local SHIP_FRICTION = 0.99
local SHIP_MAX_SPEED = 400
local SHIP_INVULNERABLE_TIME = 3
local SHIP_BLINK_INTERVAL = 0.1
local SHIP_COLLISION_RADIUS = 10
local SHIP_RESPAWN_DELAY = 1.5

local BULLET_SPEED = 500
local BULLET_LIFETIME = 1
local BULLET_MAX = 4
local BULLET_RADIUS = 2
local BULLET_COOLDOWN = 0.15

local ASTEROID_SIZES = {
    large  = { radius = 40, speed = 50,  points = 20,  children = "medium", childCount = 2 },
    medium = { radius = 20, speed = 80,  points = 50,  children = "small",  childCount = 2 },
    small  = { radius = 10, speed = 120, points = 100, children = nil,      childCount = 0 },
}
local ASTEROID_JAGGEDNESS = 0.4
local ASTEROID_MIN_VERTICES = 8
local ASTEROID_MAX_VERTICES = 12

local WAVE_START_COUNT = 4
local WAVE_INCREMENT = 2
local WAVE_MAX = 12
local WAVE_DELAY = 2
local ASTEROID_SPAWN_MIN_DIST = 150

local EXTRA_LIFE_SCORE = 10000
local STARTING_LIVES = 3

local STAR_COUNT = 150

local PARTICLE_SHIP_COUNT = 30
local PARTICLE_LARGE_COUNT = 20
local PARTICLE_MEDIUM_COUNT = 12
local PARTICLE_SMALL_COUNT = 8

local GAME_OVER_DELAY = 2

--------------------------------------------------------------------------------
-- Utility functions
--------------------------------------------------------------------------------
local function degToRad(deg)
    return deg * math.pi / 180
end

local function randomRange(min, max)
    return min + love.math.random() * (max - min)
end

local function wrapPosition(x, y, margin)
    margin = margin or 0
    if x < -margin then x = x + CANVAS_WIDTH + margin * 2 end
    if x > CANVAS_WIDTH + margin then x = x - CANVAS_WIDTH - margin * 2 end
    if y < -margin then y = y + CANVAS_HEIGHT + margin * 2 end
    if y > CANVAS_HEIGHT + margin then y = y - CANVAS_HEIGHT - margin * 2 end
    return x, y
end

local function checkCollision(x1, y1, r1, x2, y2, r2)
    local dx = x1 - x2
    local dy = y1 - y2
    local distSq = dx * dx + dy * dy
    local radSum = r1 + r2
    return distSq < radSum * radSum
end

local function clampSpeed(vx, vy, maxSpeed)
    local speed = math.sqrt(vx * vx + vy * vy)
    if speed > maxSpeed then
        vx = vx / speed * maxSpeed
        vy = vy / speed * maxSpeed
    end
    return vx, vy
end

--------------------------------------------------------------------------------
-- Entity constructors
--------------------------------------------------------------------------------
local function newShip(x, y)
    return {
        x = x,
        y = y,
        angle = -90, -- facing up
        vx = 0,
        vy = 0,
        thrusting = false,
        invulnerableTimer = SHIP_INVULNERABLE_TIME,
        blinkTimer = 0,
        blinkVisible = true,
        shootCooldown = 0,
        alive = true,
        thrustFlicker = 0,
    }
end

local function newAsteroid(size, x, y, vx, vy)
    local info = ASTEROID_SIZES[size]
    local numVerts = love.math.random(ASTEROID_MIN_VERTICES, ASTEROID_MAX_VERTICES)
    local vertices = {}
    for i = 1, numVerts do
        local angle = (i - 1) / numVerts * math.pi * 2
        local dist = info.radius * (1 - ASTEROID_JAGGEDNESS + love.math.random() * ASTEROID_JAGGEDNESS * 2)
        vertices[i] = { angle = angle, dist = dist }
    end

    -- Random direction if not specified
    if not vx or not vy then
        local angle = love.math.random() * math.pi * 2
        vx = math.cos(angle) * info.speed
        vy = math.sin(angle) * info.speed
    end

    return {
        x = x,
        y = y,
        vx = vx,
        vy = vy,
        size = size,
        radius = info.radius,
        points = info.points,
        vertices = vertices,
        rotation = 0,
        rotationSpeed = degToRad(randomRange(-90, 90)),
    }
end

local function newBullet(x, y, angle)
    local rad = degToRad(angle)
    return {
        x = x,
        y = y,
        vx = math.cos(rad) * BULLET_SPEED,
        vy = math.sin(rad) * BULLET_SPEED,
        lifetime = BULLET_LIFETIME,
    }
end

local function newParticle(x, y, vx, vy, lifetime, color)
    return {
        x = x,
        y = y,
        vx = vx,
        vy = vy,
        lifetime = lifetime,
        maxLifetime = lifetime,
        color = color or {1, 1, 1, 1},
    }
end

local function newStar()
    return {
        x = love.math.random() * CANVAS_WIDTH,
        y = love.math.random() * CANVAS_HEIGHT,
        brightness = 0.3 + love.math.random() * 0.7,
        size = 1 + love.math.random() * 1.5,
    }
end

--------------------------------------------------------------------------------
-- Game state variables
--------------------------------------------------------------------------------
local gameState          -- "title", "playing", "gameover"
local ship
local asteroids
local bullets
local particles
local stars
local score, lives, wave
local waveTimer
local nextExtraLife
local highScore
local titleBlinkTimer, titleBlinkVisible
local titleAsteroids
local gameOverTimer
local respawnTimer
local shakeTimer, shakeMagnitude
local hudFont, titleFont, smallFont

--------------------------------------------------------------------------------
-- High score persistence
--------------------------------------------------------------------------------
local function loadHighScore()
    local data = love.filesystem.read("highscore.txt")
    if data then
        return tonumber(data) or 0
    end
    return 0
end

local function saveHighScore(value)
    love.filesystem.write("highscore.txt", tostring(value))
end

--------------------------------------------------------------------------------
-- Particle spawners
--------------------------------------------------------------------------------
local function spawnExplosion(x, y, count, colors)
    for _ = 1, count do
        local angle = love.math.random() * math.pi * 2
        local speed = randomRange(30, 150)
        local vx = math.cos(angle) * speed
        local vy = math.sin(angle) * speed
        local lifetime = randomRange(0.5, 1.5)
        local color = colors[love.math.random(1, #colors)]
        table.insert(particles, newParticle(x, y, vx, vy, lifetime, {color[1], color[2], color[3], 1}))
    end
end

local function spawnShipExplosion(x, y)
    local colors = {
        {1, 1, 1},       -- white
        {1, 0.6, 0.2},   -- orange
    }
    spawnExplosion(x, y, PARTICLE_SHIP_COUNT, colors)
end

local function spawnAsteroidExplosion(x, y, size)
    local count = PARTICLE_SMALL_COUNT
    if size == "large" then count = PARTICLE_LARGE_COUNT
    elseif size == "medium" then count = PARTICLE_MEDIUM_COUNT end

    local colors = {
        {1, 1, 1},
        {0.7, 0.7, 0.7},
    }
    spawnExplosion(x, y, count, colors)
end

--------------------------------------------------------------------------------
-- Screen shake
--------------------------------------------------------------------------------
local function triggerShake(duration, magnitude)
    shakeTimer = duration
    shakeMagnitude = magnitude
end

--------------------------------------------------------------------------------
-- Spawning
--------------------------------------------------------------------------------
local function spawnAsteroidAtEdge(size, shipX, shipY)
    local x, y
    local attempts = 0
    repeat
        local edge = love.math.random(1, 4)
        if edge == 1 then     -- top
            x = love.math.random() * CANVAS_WIDTH
            y = -ASTEROID_SIZES[size].radius
        elseif edge == 2 then -- bottom
            x = love.math.random() * CANVAS_WIDTH
            y = CANVAS_HEIGHT + ASTEROID_SIZES[size].radius
        elseif edge == 3 then -- left
            x = -ASTEROID_SIZES[size].radius
            y = love.math.random() * CANVAS_HEIGHT
        else                  -- right
            x = CANVAS_WIDTH + ASTEROID_SIZES[size].radius
            y = love.math.random() * CANVAS_HEIGHT
        end
        attempts = attempts + 1
    until attempts > 20 or not shipX or not shipY or
          ((x - shipX)^2 + (y - shipY)^2) > ASTEROID_SPAWN_MIN_DIST^2

    return newAsteroid(size, x, y)
end

local function spawnWave()
    local count = math.min(WAVE_START_COUNT + (wave - 1) * WAVE_INCREMENT, WAVE_MAX)
    for _ = 1, count do
        local shipX, shipY = nil, nil
        if ship and ship.alive then
            shipX, shipY = ship.x, ship.y
        end
        table.insert(asteroids, spawnAsteroidAtEdge("large", shipX, shipY))
    end
end

--------------------------------------------------------------------------------
-- Title screen asteroids
--------------------------------------------------------------------------------
local function initTitleAsteroids()
    titleAsteroids = {}
    for _ = 1, 6 do
        local x = love.math.random() * CANVAS_WIDTH
        local y = love.math.random() * CANVAS_HEIGHT
        table.insert(titleAsteroids, newAsteroid("large", x, y))
    end
end

--------------------------------------------------------------------------------
-- Start / restart game
--------------------------------------------------------------------------------
local function startGame()
    gameState = "playing"
    score = 0
    lives = STARTING_LIVES
    wave = 1
    waveTimer = 0
    nextExtraLife = EXTRA_LIFE_SCORE
    respawnTimer = 0
    shakeTimer = 0
    shakeMagnitude = 0

    ship = newShip(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
    asteroids = {}
    bullets = {}
    particles = {}

    spawnWave()
end

--------------------------------------------------------------------------------
-- Handle collisions
--------------------------------------------------------------------------------
local function splitAsteroid(asteroid)
    local info = ASTEROID_SIZES[asteroid.size]
    if info.children then
        for _ = 1, info.childCount do
            local angle = love.math.random() * math.pi * 2
            local childInfo = ASTEROID_SIZES[info.children]
            local speed = childInfo.speed
            local vx = math.cos(angle) * speed
            local vy = math.sin(angle) * speed
            table.insert(asteroids, newAsteroid(info.children, asteroid.x, asteroid.y, vx, vy))
        end
    end
end

local function addScore(pts)
    score = score + pts
    if score >= nextExtraLife then
        lives = lives + 1
        nextExtraLife = nextExtraLife + EXTRA_LIFE_SCORE
    end
    if score > highScore then
        highScore = score
        saveHighScore(highScore)
    end
end

local function handleCollisions()
    -- Bullets vs asteroids
    for bi = #bullets, 1, -1 do
        local b = bullets[bi]
        for ai = #asteroids, 1, -1 do
            local a = asteroids[ai]
            if checkCollision(b.x, b.y, BULLET_RADIUS, a.x, a.y, a.radius) then
                -- Destroy bullet
                table.remove(bullets, bi)
                -- Score
                addScore(a.points)
                -- Explosion
                spawnAsteroidExplosion(a.x, a.y, a.size)
                -- Split
                splitAsteroid(a)
                table.remove(asteroids, ai)
                -- Small shake
                if a.size == "large" then
                    triggerShake(0.15, 4)
                elseif a.size == "medium" then
                    triggerShake(0.1, 2)
                end
                break
            end
        end
    end

    -- Ship vs asteroids
    if ship and ship.alive and ship.invulnerableTimer <= 0 then
        for ai = #asteroids, 1, -1 do
            local a = asteroids[ai]
            if checkCollision(ship.x, ship.y, SHIP_COLLISION_RADIUS, a.x, a.y, a.radius) then
                -- Kill ship
                ship.alive = false
                spawnShipExplosion(ship.x, ship.y)
                triggerShake(0.3, 8)
                -- Split asteroid
                spawnAsteroidExplosion(a.x, a.y, a.size)
                splitAsteroid(a)
                table.remove(asteroids, ai)
                -- Handle lives
                lives = lives - 1
                if lives <= 0 then
                    gameState = "gameover"
                    gameOverTimer = GAME_OVER_DELAY
                else
                    respawnTimer = SHIP_RESPAWN_DELAY
                end
                break
            end
        end
    end
end

--------------------------------------------------------------------------------
-- Drawing helpers
--------------------------------------------------------------------------------
local function getShipPoints(s, scale)
    scale = scale or 1
    local rad = degToRad(s.angle)
    local sz = SHIP_SIZE * scale
    -- Nose
    local nx = s.x + math.cos(rad) * sz
    local ny = s.y + math.sin(rad) * sz
    -- Left wing
    local lx = s.x + math.cos(rad + degToRad(140)) * sz * 0.8
    local ly = s.y + math.sin(rad + degToRad(140)) * sz * 0.8
    -- Back center (indent)
    local bx = s.x + math.cos(rad + math.pi) * sz * 0.4
    local by = s.y + math.sin(rad + math.pi) * sz * 0.4
    -- Right wing
    local rx = s.x + math.cos(rad - degToRad(140)) * sz * 0.8
    local ry = s.y + math.sin(rad - degToRad(140)) * sz * 0.8

    return nx, ny, lx, ly, bx, by, rx, ry
end

local function drawShipShape(s, scale)
    local nx, ny, lx, ly, bx, by, rx, ry = getShipPoints(s, scale)
    love.graphics.line(nx, ny, lx, ly, bx, by, rx, ry, nx, ny)
end

local function drawThrustFlame(s)
    local rad = degToRad(s.angle)
    local sz = SHIP_SIZE
    -- Base points of the flame (near back of ship)
    local bl1x = s.x + math.cos(rad + degToRad(155)) * sz * 0.5
    local bl1y = s.y + math.sin(rad + degToRad(155)) * sz * 0.5
    local br1x = s.x + math.cos(rad - degToRad(155)) * sz * 0.5
    local br1y = s.y + math.sin(rad - degToRad(155)) * sz * 0.5
    -- Flame tip (flickers)
    local flameLen = sz * (0.5 + s.thrustFlicker * 0.5)
    local ftx = s.x + math.cos(rad + math.pi) * flameLen
    local fty = s.y + math.sin(rad + math.pi) * flameLen

    love.graphics.setColor(1, 0.6, 0.2, 1)
    love.graphics.line(bl1x, bl1y, ftx, fty, br1x, br1y)
end

local function getAsteroidPolygon(a)
    local pts = {}
    for i, v in ipairs(a.vertices) do
        local angle = v.angle + a.rotation
        local px = a.x + math.cos(angle) * v.dist
        local py = a.y + math.sin(angle) * v.dist
        pts[#pts + 1] = px
        pts[#pts + 1] = py
    end
    return pts
end

local function drawEntityWrapped(entity, radius, drawFunc)
    -- Draw at current position
    drawFunc(entity.x, entity.y)

    -- Check if near edges and draw duplicates for seamless wrapping
    local margin = radius
    local drawLeft = entity.x < margin
    local drawRight = entity.x > CANVAS_WIDTH - margin
    local drawTop = entity.y < margin
    local drawBottom = entity.y > CANVAS_HEIGHT - margin

    local ox, oy = entity.x, entity.y

    if drawRight then
        entity.x = ox - CANVAS_WIDTH
        drawFunc(entity.x, entity.y)
        entity.x = ox
    end
    if drawLeft then
        entity.x = ox + CANVAS_WIDTH
        drawFunc(entity.x, entity.y)
        entity.x = ox
    end
    if drawBottom then
        entity.y = oy - CANVAS_HEIGHT
        drawFunc(entity.x, entity.y)
        entity.y = oy
    end
    if drawTop then
        entity.y = oy + CANVAS_HEIGHT
        drawFunc(entity.x, entity.y)
        entity.y = oy
    end

    -- Corners
    if drawRight and drawTop then
        entity.x = ox - CANVAS_WIDTH
        entity.y = oy + CANVAS_HEIGHT
        drawFunc(entity.x, entity.y)
        entity.x = ox; entity.y = oy
    end
    if drawRight and drawBottom then
        entity.x = ox - CANVAS_WIDTH
        entity.y = oy - CANVAS_HEIGHT
        drawFunc(entity.x, entity.y)
        entity.x = ox; entity.y = oy
    end
    if drawLeft and drawTop then
        entity.x = ox + CANVAS_WIDTH
        entity.y = oy + CANVAS_HEIGHT
        drawFunc(entity.x, entity.y)
        entity.x = ox; entity.y = oy
    end
    if drawLeft and drawBottom then
        entity.x = ox + CANVAS_WIDTH
        entity.y = oy - CANVAS_HEIGHT
        drawFunc(entity.x, entity.y)
        entity.x = ox; entity.y = oy
    end
end

--------------------------------------------------------------------------------
-- LOVE callbacks
--------------------------------------------------------------------------------
function love.load()
    love.graphics.setBackgroundColor(0, 0, 0)

    hudFont = love.graphics.newFont(18)
    titleFont = love.graphics.newFont(48)
    smallFont = love.graphics.newFont(14)

    highScore = loadHighScore()

    -- Create star field
    stars = {}
    for _ = 1, STAR_COUNT do
        table.insert(stars, newStar())
    end

    -- Init title state
    gameState = "title"
    titleBlinkTimer = 0
    titleBlinkVisible = true
    gameOverTimer = 0
    respawnTimer = 0
    shakeTimer = 0
    shakeMagnitude = 0
    score = 0
    lives = 0
    wave = 0
    waveTimer = 0
    nextExtraLife = EXTRA_LIFE_SCORE

    asteroids = {}
    bullets = {}
    particles = {}

    initTitleAsteroids()
end

function love.update(dt)
    -- Cap dt to prevent physics explosions
    if dt > 0.05 then dt = 0.05 end

    -- Update screen shake
    if shakeTimer > 0 then
        shakeTimer = shakeTimer - dt
        if shakeTimer < 0 then shakeTimer = 0 end
    end

    -- Update particles (always)
    for i = #particles, 1, -1 do
        local p = particles[i]
        p.x = p.x + p.vx * dt
        p.y = p.y + p.vy * dt
        p.lifetime = p.lifetime - dt
        if p.lifetime <= 0 then
            table.remove(particles, i)
        end
    end

    --------------------------
    -- TITLE state
    --------------------------
    if gameState == "title" then
        titleBlinkTimer = titleBlinkTimer + dt
        if titleBlinkTimer >= 0.5 then
            titleBlinkTimer = titleBlinkTimer - 0.5
            titleBlinkVisible = not titleBlinkVisible
        end

        -- Update floating asteroids
        for _, a in ipairs(titleAsteroids) do
            a.x = a.x + a.vx * dt
            a.y = a.y + a.vy * dt
            a.rotation = a.rotation + a.rotationSpeed * dt
            a.x, a.y = wrapPosition(a.x, a.y, a.radius)
        end
        return
    end

    --------------------------
    -- GAME OVER state
    --------------------------
    if gameState == "gameover" then
        gameOverTimer = gameOverTimer - dt
        if gameOverTimer < 0 then gameOverTimer = 0 end

        titleBlinkTimer = titleBlinkTimer + dt
        if titleBlinkTimer >= 0.5 then
            titleBlinkTimer = titleBlinkTimer - 0.5
            titleBlinkVisible = not titleBlinkVisible
        end

        -- Still update asteroids floating around
        for _, a in ipairs(asteroids) do
            a.x = a.x + a.vx * dt
            a.y = a.y + a.vy * dt
            a.rotation = a.rotation + a.rotationSpeed * dt
            a.x, a.y = wrapPosition(a.x, a.y, a.radius)
        end
        return
    end

    --------------------------
    -- PLAYING state
    --------------------------

    -- Ship respawn
    if not ship.alive then
        respawnTimer = respawnTimer - dt
        if respawnTimer <= 0 then
            ship = newShip(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
        end
    end

    -- Ship update
    if ship.alive then
        -- Rotation
        local rotating = false
        if love.keyboard.isDown("left") or love.keyboard.isDown("a") then
            ship.angle = ship.angle - SHIP_ROTATION_SPEED * dt
            rotating = true
        end
        if love.keyboard.isDown("right") or love.keyboard.isDown("d") then
            ship.angle = ship.angle + SHIP_ROTATION_SPEED * dt
            rotating = true
        end

        -- Thrust
        ship.thrusting = love.keyboard.isDown("up") or love.keyboard.isDown("w")
        if ship.thrusting then
            local rad = degToRad(ship.angle)
            ship.vx = ship.vx + math.cos(rad) * SHIP_THRUST * dt
            ship.vy = ship.vy + math.sin(rad) * SHIP_THRUST * dt
            ship.vx, ship.vy = clampSpeed(ship.vx, ship.vy, SHIP_MAX_SPEED)
            ship.thrustFlicker = ship.thrustFlicker + dt * 20
            if ship.thrustFlicker > 1 then ship.thrustFlicker = ship.thrustFlicker - 1 end
        end

        -- Friction
        ship.vx = ship.vx * SHIP_FRICTION
        ship.vy = ship.vy * SHIP_FRICTION

        -- Movement
        ship.x = ship.x + ship.vx * dt
        ship.y = ship.y + ship.vy * dt
        ship.x, ship.y = wrapPosition(ship.x, ship.y, SHIP_SIZE)

        -- Invulnerability
        if ship.invulnerableTimer > 0 then
            ship.invulnerableTimer = ship.invulnerableTimer - dt
            ship.blinkTimer = ship.blinkTimer + dt
            if ship.blinkTimer >= SHIP_BLINK_INTERVAL then
                ship.blinkTimer = ship.blinkTimer - SHIP_BLINK_INTERVAL
                ship.blinkVisible = not ship.blinkVisible
            end
            if ship.invulnerableTimer <= 0 then
                ship.invulnerableTimer = 0
                ship.blinkVisible = true
            end
        end

        -- Shooting
        ship.shootCooldown = ship.shootCooldown - dt
        if ship.shootCooldown < 0 then ship.shootCooldown = 0 end

        if love.keyboard.isDown("space") and ship.shootCooldown <= 0 and #bullets < BULLET_MAX then
            local rad = degToRad(ship.angle)
            local bx = ship.x + math.cos(rad) * SHIP_SIZE
            local by = ship.y + math.sin(rad) * SHIP_SIZE
            table.insert(bullets, newBullet(bx, by, ship.angle))
            ship.shootCooldown = BULLET_COOLDOWN
        end
    end

    -- Update bullets
    for i = #bullets, 1, -1 do
        local b = bullets[i]
        b.x = b.x + b.vx * dt
        b.y = b.y + b.vy * dt
        b.lifetime = b.lifetime - dt
        b.x, b.y = wrapPosition(b.x, b.y, BULLET_RADIUS)
        if b.lifetime <= 0 then
            table.remove(bullets, i)
        end
    end

    -- Update asteroids
    for _, a in ipairs(asteroids) do
        a.x = a.x + a.vx * dt
        a.y = a.y + a.vy * dt
        a.rotation = a.rotation + a.rotationSpeed * dt
        a.x, a.y = wrapPosition(a.x, a.y, a.radius)
    end

    -- Collisions
    handleCollisions()

    -- Wave management
    if #asteroids == 0 and gameState == "playing" then
        waveTimer = waveTimer + dt
        if waveTimer >= WAVE_DELAY then
            wave = wave + 1
            waveTimer = 0
            spawnWave()
        end
    else
        waveTimer = 0
    end
end

function love.draw()
    -- Screen shake
    love.graphics.push()
    if shakeTimer > 0 then
        local sx = (love.math.random() * 2 - 1) * shakeMagnitude
        local sy = (love.math.random() * 2 - 1) * shakeMagnitude
        love.graphics.translate(sx, sy)
    end

    -- Draw stars
    for _, s in ipairs(stars) do
        love.graphics.setColor(s.brightness, s.brightness, s.brightness, 1)
        love.graphics.circle("fill", s.x, s.y, s.size * 0.5)
    end

    --------------------------
    -- TITLE state drawing
    --------------------------
    if gameState == "title" then
        -- Draw floating asteroids
        love.graphics.setColor(1, 1, 1, 1)
        for _, a in ipairs(titleAsteroids) do
            drawEntityWrapped(a, a.radius, function(x, y)
                local oldX, oldY = a.x, a.y
                a.x, a.y = x, y
                local pts = getAsteroidPolygon(a)
                a.x, a.y = oldX, oldY
                if #pts >= 6 then
                    love.graphics.polygon("line", pts)
                end
            end)
        end

        -- Title text
        love.graphics.setColor(1, 1, 1, 1)
        love.graphics.setFont(titleFont)
        love.graphics.printf("ASTEROIDS", 0, CANVAS_HEIGHT / 2 - 80, CANVAS_WIDTH, "center")

        if titleBlinkVisible then
            love.graphics.setFont(hudFont)
            love.graphics.printf("Press SPACE to Start", 0, CANVAS_HEIGHT / 2 + 20, CANVAS_WIDTH, "center")
        end

        -- High score
        if highScore > 0 then
            love.graphics.setFont(smallFont)
            love.graphics.printf("High Score: " .. string.format("%06d", highScore), 0, CANVAS_HEIGHT / 2 + 60, CANVAS_WIDTH, "center")
        end

        love.graphics.pop()
        return
    end

    --------------------------
    -- Draw game entities
    --------------------------

    -- Draw asteroids
    love.graphics.setColor(1, 1, 1, 1)
    for _, a in ipairs(asteroids) do
        drawEntityWrapped(a, a.radius, function(x, y)
            local oldX, oldY = a.x, a.y
            a.x, a.y = x, y
            local pts = getAsteroidPolygon(a)
            a.x, a.y = oldX, oldY
            if #pts >= 6 then
                love.graphics.polygon("line", pts)
            end
        end)
    end

    -- Draw bullets
    love.graphics.setColor(1, 1, 1, 1)
    for _, b in ipairs(bullets) do
        drawEntityWrapped(b, BULLET_RADIUS, function(x, y)
            love.graphics.circle("fill", x, y, BULLET_RADIUS)
        end)
    end

    -- Draw ship
    if ship and ship.alive then
        local visible = true
        if ship.invulnerableTimer > 0 then
            visible = ship.blinkVisible
        end
        if visible then
            love.graphics.setColor(1, 1, 1, 1)
            drawEntityWrapped(ship, SHIP_SIZE, function(x, y)
                local oldX, oldY = ship.x, ship.y
                ship.x, ship.y = x, y
                drawShipShape(ship)
                if ship.thrusting then
                    drawThrustFlame(ship)
                end
                ship.x, ship.y = oldX, oldY
            end)
        end
    end

    -- Draw particles
    for _, p in ipairs(particles) do
        local alpha = p.lifetime / p.maxLifetime
        love.graphics.setColor(p.color[1], p.color[2], p.color[3], alpha)
        love.graphics.circle("fill", p.x, p.y, 2)
    end

    --------------------------
    -- HUD
    --------------------------
    love.graphics.setColor(1, 1, 1, 1)
    love.graphics.setFont(hudFont)

    -- Score top-left
    love.graphics.print(string.format("%06d", score), 10, 10)

    -- Wave number
    love.graphics.setFont(smallFont)
    love.graphics.print("Wave " .. wave, 10, 35)

    -- High score top-right
    love.graphics.setFont(hudFont)
    local hsText = string.format("HI %06d", highScore)
    local hsWidth = hudFont:getWidth(hsText)
    love.graphics.print(hsText, CANVAS_WIDTH - hsWidth - 10, 10)

    -- Life icons
    for i = 1, lives do
        local lx = 10 + (i - 1) * 25 + 12
        local ly = 62
        local lifeShip = { x = lx, y = ly, angle = -90 }
        love.graphics.setColor(1, 1, 1, 1)
        drawShipShape(lifeShip, 0.5)
    end

    --------------------------
    -- GAME OVER overlay
    --------------------------
    if gameState == "gameover" then
        love.graphics.setColor(1, 1, 1, 1)
        love.graphics.setFont(titleFont)
        love.graphics.printf("GAME OVER", 0, CANVAS_HEIGHT / 2 - 60, CANVAS_WIDTH, "center")

        if gameOverTimer <= 0 and titleBlinkVisible then
            love.graphics.setFont(hudFont)
            love.graphics.printf("Press SPACE to Start", 0, CANVAS_HEIGHT / 2 + 20, CANVAS_WIDTH, "center")
        end
    end

    love.graphics.pop()
end

function love.keypressed(key)
    if key == "escape" then
        love.event.quit()
        return
    end

    if gameState == "title" then
        if key == "space" or key == "return" then
            startGame()
        end
    elseif gameState == "gameover" then
        if gameOverTimer <= 0 and (key == "space" or key == "return") then
            startGame()
        end
    end
end
