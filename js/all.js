jQuery(document).ready(function () {
    // Game state variables
    let level = 0;
    let socket = io.connect('http://localhost:1337');
    let gameOver = false;
    let successLevel = false;
    let currentRoom = '';
    let allSuccess = 0;
    let role = 'guide';
    let userCount = 0;
    let movementCount = 0;
    let movementLimit;
    let score = '';
    let playing = false;
    let currentMenu;
    let alreadyPassed = false;

    // Game reset function
    function reset() {
        myMap.animationSuccess();
        myMap.create();
        gameOver = false;
        successLevel = false;
        myMap.currentPositionPerso = { x: 0, y: 0 };
        myPerso.perso.finish().css({ left: 65, top: 35 });
    }

    // Login handling
    $('#login').submit(function (event) {
        event.preventDefault();
        const username = $('#pseudo').val().replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '');
        if (username === '' || username.length > 8) {
            $('.error_pseudo').fadeIn();
        } else {
            socket.emit('login', { username: username });
        }
    });

    // Socket event handlers
    socket.on('change_pseudo', function () {
        $('.error_pseudo').fadeIn();
    });

    socket.on('newuser', function (user) {
        userCount++;
        updateUserList();
        $('#users div ul').append(`<li><a class="room" data-id="${user.socket_id}" href="#" id="${user.username}">${user.username}</a></li>`);
        attachRoomClickHandlers();
    });

    socket.on('current_user', function (me) {
        $('.current_user').text(me.username).attr('data-id', me.socket_id);
        $(`#${me.username}`).parent().remove();
    });

    socket.on('disuseur', function (user) {
        level = 0;
        $(`#${user.username}`).parent().remove();
        userCount--;
        updateUserList();
    });

    // Helper functions
    function updateUserList() {
        if ($('#noUser').length) {
            $('#noUser').parent().remove();
        }
        
        if (userCount <= 1) {
            $('#users div ul').append('<li><a id="noUser">no user for the moment</a></li>');
        }
    }

    function attachRoomClickHandlers() {
        $('.room').off('click').on('click', function (event) {
            event.preventDefault();
            const username = $('.current_user').text();
            const currentUserId = $('.current_user').attr("data-id");
            const socketId = $(this).attr("data-id");
            
            socket.emit('invite', socketId, username, currentUserId);
            $('.user_invite_feedback').text($(this).text());
            $('.ask_join').slideDown(400);
        });
    }

    // Room management
    $('.unjoin_room').click(function (event) {
        event.preventDefault();
        $('.join').slideUp(400);
    });

    $('.join_room').click(function (event) {
        event.preventDefault();
        const idCoop = $('.user_invite').attr('data-id');
        socket.emit('launch', { id_coop: idCoop });
    });

    // Game start
    $('.start_game').click(function () {
        $('#background_svg').remove();
        myPerso.displayRole(role);
        myMap.displayScore(level);
        playing = true;
    });

    // Socket game events
    socket.on('invite_send', function (client) {
        $('.user_invite').html(client.username).attr('data-id', client.id);
        $('.join').slideDown(400);
    });

    socket.on('invite_an_other', function () {
        $('.join').slideUp(400);
    });

    socket.on('launch_send', function () {
        socket.emit('create');
    });

    socket.on('start', function (currentRoomReceive) {
        currentRoom = currentRoomReceive;
        $('#users').fadeOut();
        myMap.create();
    });

    socket.on('disconenct_room', function () {
        $(".restart_box").addClass('active');
        $('.best_score').html(`your best score : ${level}`);
        $('.restart').click(function () {
            window.location.assign("/");
        });
    });

    // Map Class
    class Map {
        constructor() {
            this.value = [1, 2, 3];
            this.matrice = '';
            this.matriceBomb = '';
            this.currentPositionPerso = { x: 0, y: 0 };
            this.matriceTeleport = Array(4).fill().map(() => Array(4).fill(0));
            this.matriceDoubleDirection = Array(4).fill().map(() => Array(4).fill(0));
            this.terrainActif = false;
        }

        animationSuccess() {
            $(".all_map").toggleClass('active');
        }

        displayScore(level) {
            $('#score_current').empty();
            $(`<h1>level : ${level}</h1>`).appendTo('#score_current').fadeIn(2000).fadeOut(2000);
        }

        randomDecorMatrice() {
            const matrix = Array(4).fill().map(() => Array(4).fill(0));
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    matrix[i][j] = this.value[Math.floor(Math.random() * 3)];
                }
            }
            return matrix;
        }

        randomWayMatrice() {
            const pathMatrix = Array(4).fill().map(() => Array(4).fill(0));
            let currentX = 0, currentY = 0;
            const destX = 3, destY = 3;

            while (currentX !== destX || currentY !== destY) {
                const randomDirection = Math.floor(Math.random() * 2);
                
                if (randomDirection === 0) {
                    if (currentX < destX) {
                        currentX++;
                        pathMatrix[currentX][currentY] = 99;
                    } else {
                        currentY++;
                        pathMatrix[currentX][currentY] = 99;
                    }
                } else {
                    if (currentY < destY) {
                        currentY++;
                        pathMatrix[currentX][currentY] = 99;
                    } else {
                        currentX++;
                        pathMatrix[currentX][currentY] = 99;
                    }
                }
            }
            return pathMatrix;
        }

        bombMatrice(bombCount) {
            const bombMatrix = Array(4).fill().map(() => Array(4).fill(0));

            // Special level configurations
            if (level === 1) {
                bombMatrix[0][2] = 1;
            } else if (level === 6) {
                bombMatrix[1][3] = 1;
            } else {
                for (let i = bombCount; i > 0; i--) {
                    const bombX = Math.floor(Math.random() * 3);
                    const bombY = Math.floor(Math.random() * 3);

                    // Check if bomb already placed or in forbidden positions
                    if (bombMatrix[bombX][bombY] === 1 || 
                        this.isForbiddenPosition(bombX, bombY)) {
                        i++;
                        continue;
                    }
                    bombMatrix[bombX][bombY] = 1;
                }
            }

            this.matriceBomb = bombMatrix;
            this.getPositionBombDom();
        }

        isForbiddenPosition(x, y) {
            const forbidden = [
                [3, 3], [0, 0], [1, 0], [0, 1], [1, 1]
            ];
            return forbidden.some(pos => pos[0] === x && pos[1] === y);
        }

        getPositionBombDom() {
            const caseBomb = [];
            for (let j = 0; j < this.matriceBomb.length; j++) {
                for (let i = 0; i < this.matriceBomb.length; i++) {
                    if (this.matriceBomb[j][i] === 1) {
                        caseBomb.push((j * 4) + i + 1 + 3);
                    }
                }
            }
            this.bombDisplay(caseBomb);
        }

        bombDisplay(caseBomb) {
            $('.part_map').removeClass('bombAction bombActionActivate');
            caseBomb.forEach(bombCase => {
                $(`.part_map:nth-child(${bombCase})`).addClass('bombAction');
            });
        }

        // Level-specific matrix configurations
        getLevelMatrix() {
            const levelMatrices = {
                0: [
                    [0, 99, 99, 99],
                    [99, 99, 99, 99],
                    [99, 99, 99, 99],
                    [99, 99, 99, 0]
                ],
                1: [
                    [0, 99, 99, 1],
                    [99, 99, 99, 1],
                    [99, 99, 99, 1],
                    [1, 1, 1, 0]
                ],
                2: [
                    [0, 99, 99, 1],
                    [1, 1, 99, 99],
                    [1, 99, 99, 1],
                    [1, 1, 99, 0]
                ],
                3: [
                    [99, 1, 2, 1],
                    [99, 1, 99, 1],
                    [99, 99, 99, 99],
                    [99, 1, 2, 1]
                ],
                4: [
                    [99, 2, 99, 99],
                    [3, 3, 3, 2],
                    [2, 2, 3, 3],
                    [99, 2, 3, 99]
                ],
                5: [
                    [99, 1, 99, 99],
                    [99, 1, 99, 99],
                    [99, 99, 1, 99],
                    [99, 99, 1, 99]
                ],
                6: [
                    [99, 2, 99, 99],
                    [99, 2, 99, 99],
                    [99, 99, 2, 2],
                    [99, 99, 2, 99]
                ]
            };

            return levelMatrices[level] || this.generateRandomMatrix();
        }

        generateRandomMatrix() {
            const pathMatrix = this.randomWayMatrice();
            const decorMatrix = this.randomDecorMatrice();
            const resultMatrix = Array(4).fill().map(() => Array(4).fill(0));

            for (let j = 0; j < 4; j++) {
                for (let i = 0; i < 4; i++) {
                    resultMatrix[j][i] = pathMatrix[j][i] + decorMatrix[j][i];
                }
            }
            return resultMatrix;
        }

        terrainAction(terrainValue) {
            switch (terrainValue) {
                case 1: // Bush
                    break;
                case 2: // Water - game over
                    socket.emit('game_over', currentRoom);
                    break;
                case 3: // Ice
                    this.terrainActif = true;
                    break;
                default:
                    if (terrainValue >= 99 && terrainValue < 1000) {
                        // Ground
                    } else if (terrainValue === 1000) {
                        // Start/End
                    }
                    break;
            }
        }

        terrainActionGlaceActif() {
            if (this.terrainActif) {
                this.matrice[this.currentPositionPerso.y][this.currentPositionPerso.x] = 2;
                this.generate();
                this.terrainActif = false;
            }
        }

        positionPersoMatrice(movement) {
            switch (movement) {
                case 'left':
                    this.currentPositionPerso.x--;
                    break;
                case 'right':
                    this.currentPositionPerso.x++;
                    break;
                case 'up':
                    this.currentPositionPerso.y--;
                    break;
                case 'down':
                    this.currentPositionPerso.y++;
                    break;
            }

            const terrainValue = this.matrice[this.currentPositionPerso.y][this.currentPositionPerso.x];
            this.terrainAction(terrainValue);
        }

        generate() {
            $('.part_map').remove();
            
            // Set start and end positions
            this.matrice[3][3] = 1000;
            this.matrice[0][0] = 1000;

            this.matrice.forEach((row, i) => {
                row.forEach((val, j) => {
                    let className = this.getTerrainClass(val);
                    let element = className === 'buisson' 
                        ? '<div class="part_map"><span class="front"></span><span class="up"></span><span class="side"></span></div>'
                        : '<div class="part_map" />';
                    
                    $(element).appendTo('.all_map').addClass(className);
                });
            });

            // Initialize game elements
            if (!alreadyPassed && !this.terrainActif) {
                $('.part_map:nth-child(4)').addClass('active');
                this.bombMatrice(0);
            }

            this.initSpecialCases();
        }

        getTerrainClass(value) {
            if (value === 1) return 'buisson';
            if (value === 2) return 'water';
            if (value === 3) return 'glace';
            if (value >= 99 && value < 1000) return 'terre';
            if (value === 1000) return 'start';
            return 'terre';
        }

        initSpecialCases() {
            this.initDoubleDirection();
            this.initTeleport();
        }

        initTeleport() {
            // Teleport configuration for specific levels
            if (level === 5 || level === 6) {
                this.matriceTeleport = [
                    [0, 0, 1, 0],
                    [0, 0, 0, 0],
                    [0, 0, 0, 0],
                    [0, 1, 0, 0]
                ];
            } else {
                this.matriceTeleport = Array(4).fill().map(() => Array(4).fill(0));
            }

            this.displayTeleportCases();
        }

        displayTeleportCases() {
            $('.part_map').removeClass('teleportAction');
            const teleportCases = this.getCasesFromMatrix(this.matriceTeleport);
            teleportCases.forEach(caseIndex => {
                $(`.part_map:nth-child(${caseIndex})`).addClass('teleportAction');
            });
        }

        initDoubleDirection() {
            if (level === 3) {
                this.matriceDoubleDirection = [
                    [0, 0, 0, 0],
                    [0, 0, 0, 0],
                    [0, 0, 1, 0],
                    [0, 0, 0, 0]
                ];
            } else {
                this.matriceDoubleDirection = Array(4).fill().map(() => Array(4).fill(0));
            }

            this.displayDoubleActionCases();
        }

        displayDoubleActionCases() {
            $('.part_map').removeClass('doubleAction');
            const doubleActionCases = this.getCasesFromMatrix(this.matriceDoubleDirection);
            doubleActionCases.forEach(caseIndex => {
                $(`.part_map:nth-child(${caseIndex})`).addClass('doubleAction');
            });
        }

        getCasesFromMatrix(matrix) {
            const cases = [];
            for (let j = 0; j < matrix.length; j++) {
                for (let i = 0; i < matrix[j].length; i++) {
                    if (matrix[j][i] === 1) {
                        cases.push((j * 4) + i + 1 + 3);
                    }
                }
            }
            return cases;
        }

        create() {
            if (role === 'guide') {
                $('#btn_repeat').fadeOut();
                this.matrice = this.getLevelMatrix();
                socket.emit('share_map', {
                    'map': this.matrice,
                    'current_room': currentRoom
                });
                this.generate();
            }
            myPerso.displayRole(role);
        }

        checkSuccess() {
            if (this.currentPositionPerso.y === 3 && this.currentPositionPerso.x === 3) {
                this.animationSuccess();
                setTimeout(() => {
                    movementLimit = movementCount;
                    movementCount = 0;
                    socket.emit('success', currentRoom);
                }, 3000);
                successLevel = true;
            }
        }

        doubleActionActif(direction) {
            if (this.matriceDoubleDirection[this.currentPositionPerso.y][this.currentPositionPerso.x] === 1) {
                switch (direction) {
                    case 'left':
                        if (this.currentPositionPerso.x - 2 >= 0) {
                            myPerso[direction]();
                            this.positionPersoMatrice(direction);
                            myPerso.displayCurrentPosition();
                        }
                        break;
                    case 'right':
                        if (this.currentPositionPerso.x + 2 <= 3) {
                            myPerso[direction]();
                            this.positionPersoMatrice(direction);
                            myPerso.displayCurrentPosition();
                        }
                        break;
                    case 'up':
                        if (this.currentPositionPerso.y - 2 >= 0) {
                            myPerso[direction]();
                            this.positionPersoMatrice(direction);
                            myPerso.displayCurrentPosition();
                        }
                        break;
                    case 'down':
                        if (this.currentPositionPerso.y + 2 <= 3) {
                            myPerso[direction]();
                            this.positionPersoMatrice(direction);
                            myPerso.displayCurrentPosition();
                        }
                        break;
                }
            }
        }

        teleportActif(direction) {
            let teleportTriggered = false;
            switch (direction) {
                case 'left':
                    if (this.currentPositionPerso.x > 0 && 
                        this.matriceTeleport[this.currentPositionPerso.y][this.currentPositionPerso.x - 1] === 1) {
                        this.currentPositionPerso.x = this.currentPositionPerso.x - 1;
                        teleportTriggered = true;
                    }
                    break;
                case 'right':
                    if (this.currentPositionPerso.x < 3 && 
                        this.matriceTeleport[this.currentPositionPerso.y][this.currentPositionPerso.x + 1] === 1) {
                        this.currentPositionPerso.x = this.currentPositionPerso.x + 1;
                        teleportTriggered = true;
                    }
                    break;
                case 'up':
                    if (this.currentPositionPerso.y > 0 && 
                        this.matriceTeleport[this.currentPositionPerso.y - 1][this.currentPositionPerso.x] === 1) {
                        this.currentPositionPerso.y = this.currentPositionPerso.y - 1;
                        teleportTriggered = true;
                    }
                    break;
                case 'down':
                    if (this.currentPositionPerso.y < 3 && 
                        this.matriceTeleport[this.currentPositionPerso.y + 1][this.currentPositionPerso.x] === 1) {
                        this.currentPositionPerso.y = this.currentPositionPerso.y + 1;
                        teleportTriggered = true;
                    }
                    break;
            }

            if (teleportTriggered) {
                this.teleportToDestination();
            }
        }

        teleportToDestination() {
            let destinationPosition = { x: 0, y: 0 };
            
            // Find the other teleport position
            for (let j = 0; j < this.matriceTeleport.length; j++) {
                for (let i = 0; i < this.matriceTeleport[j].length; i++) {
                    if (this.matriceTeleport[j][i] === 1 && 
                        j !== this.currentPositionPerso.y && 
                        i !== this.currentPositionPerso.x) {
                        destinationPosition = { x: i, y: j };
                    }
                }
            }

            // Move character to destination
            myPerso.perso.finish().css({
                left: (destinationPosition.x * 100) + 65,
                top: (destinationPosition.y * 100) + 35
            });

            this.currentPositionPerso = destinationPosition;
        }

        bombAction() {
            if (level === 1) {
                this.matrice = [
                    [0, 99, 99, 1],
                    [99, 99, 99, 1],
                    [99, 99, 99, 1],
                    [1, 1, 99, 0],
                ];
            }
            if (level === 6) {
                this.matrice = [
                    [99, 2, 99, 99],
                    [99, 2, 99, 99],
                    [99, 99, 2, 99],
                    [99, 99, 2, 99],
                ];
            }

            alreadyPassed = true;
            this.generate();
            alreadyPassed = false;
        }
    }

    // Character Class
    class Character {
        constructor() {
            this.perso = $('.perso');
        }

        displayRole(playerRole) {
            $("#role_guide, #role_aveugle").removeClass('active');
            $(`#role_${playerRole === 'guide' ? 'guide' : 'aveugle'}`).addClass('active');
        }

        verifyPosition(direction) {
            const { x, y } = myMap.currentPositionPerso;

            // Check bounds and obstacles
            switch (direction) {
                case 'left':
                    if (x <= 0) return false;
                    return this.checkTerrain(x - 1, y);
                case 'right':
                    if (x >= 3) return false;
                    return this.checkTerrain(x + 1, y);
                case 'up':
                    if (y <= 0) return false;
                    return this.checkTerrain(x, y - 1);
                case 'down':
                    if (y >= 3) return false;
                    return this.checkTerrain(x, y + 1);
            }

            // Check if at end position
            return !(x === 3 && y === 3);
        }

        checkTerrain(x, y) {
            if (myMap.matrice[y][x] === 1) return false; // Bush blocks movement
            if (myMap.matriceBomb[y][x] === 1) myMap.bombAction(); // Bomb triggers
            return true;
        }

        displayCurrentPosition() {
            if (role === 'aveugle') {
                const displayIndex = (myMap.currentPositionPerso.y * 4) + myMap.currentPositionPerso.x + 1;
                $('.all_map>.part_map').removeClass('active');
                $(`.all_map>.part_map:nth-child(${displayIndex + 3})`).addClass('active');
            }
        }

        incrementMovement() {
            movementCount++;
        }

        // Movement animations
        left() { this.perso.finish().animate({ left: "-=100px" }, "slow"); }
        right() { this.perso.finish().animate({ left: "+=100px" }, "slow"); }
        up() { this.perso.finish().animate({ top: "-=100px" }, "slow"); }
        down() { this.perso.finish().animate({ top: "+=100px" }, "slow"); }
    }

    // Initialize game objects
    const myMap = new Map();
    const myPerso = new Character();

    // Socket event handlers for game mechanics
    socket.on('send_map', function (mapReceive) {
        myMap.matrice = mapReceive;
        myMap.generate();
        myMap.bombMatrice(0);
        $('.all_map').addClass('aveugle');
        $('.section_sound').fadeOut();
        myMap.initSpecialCases();
    });

    socket.on('logged', function () {
        $(".section_login .logo").animate({ top: -30 }, 1000, function () {
            $('.section_login').fadeOut();
        });
    });

    socket.on('aveugle', function () {
        role = 'aveugle';
    });

    // Movement handling
    function handleMovement(direction) {
        if (role === 'aveugle' && playing) {
            socket.emit('mouvement', {
                direction: direction,
                current_room: currentRoom
            });
        }
    }

    // Keyboard controls
    window.addEventListener("keydown", function(e) {
        const directions = {
            37: 'left', 38: 'up', 39: 'right', 40: 'down'
        };
        if (directions[e.keyCode]) {
            handleMovement(directions[e.keyCode]);
        }
    });

    // Touch/swipe controls
    if (typeof Hammer !== 'undefined') {
        $('body').hammer().data("hammer").get("swipe").set({
            direction: Hammer.DIRECTION_ALL
        });

        const swipeDirections = ['left', 'right', 'up', 'down'];
        swipeDirections.forEach(direction => {
            $('body').hammer().on(`swipe${direction}`, () => handleMovement(direction));
        });
    }

    // Movement processing
    socket.on('recive', function (direction) {
        $('.perso').removeClass('active');
        
        if (myPerso.verifyPosition(direction) && !successLevel && !gameOver) {
            // Pre-movement actions
            myMap.terrainActionGlaceActif();
            myMap.doubleActionActif(direction);
            myMap.teleportActif(direction);

            // Execute movement
            myPerso[direction]();
            myMap.positionPersoMatrice(direction);
            myPerso.displayCurrentPosition();
            myMap.checkSuccess();
        }
    });

    // Sound system
    const sounds = {
        left: new Howl({
            urls: ['sound/left.mp3', 'sound/left.ogg'],
            volume: 1,
            sprite: { 0: [1700, 800], 1: [2500, 1000], 2: [3500, 1000] }
        }),
        right: new Howl({
            urls: ['sound/right.mp3', 'sound/right.ogg'],
            volume: 1,
            sprite: { 0: [3000, 1000], 1: [4200, 1500], 2: [5700, 1000] }
        }),
        up: new Howl({
            urls: ['sound/up.mp3', 'sound/up.ogg'],
            volume: 1,
            sprite: { 0: [1700, 1780], 1: [3480, 1000], 2: [4480, 1050] }
        }),
        down: new Howl({
            urls: ['sound/down.mp3', 'sound/down.ogg'],
            sprite: { 0: [1700, 1000], 1: [2780, 1100], 2: [4000, 1300] }
        })
    };

    function stopAllSounds() {
        Object.values(sounds).forEach(sound => sound.stop());
    }

    // Sound controls
    const soundDirections = ['left', 'right', 'up', 'down'];
    soundDirections.forEach(direction => {
        $(`.sound_${direction}`).click(function(event) {
            event.preventDefault();
            socket.emit('sound', { direction, current_room: currentRoom });
            
            // Animation handling
            const animationClass = (direction === 'down' || direction === 'left') ? 'active_bis' : 'active';
            $(this).addClass(animationClass)
                   .one('animationend webkitAnimationEnd MSAnimationEnd oAnimationEnd', 
                        () => $(this).removeClass(animationClass));
        });
    });

    socket.on('sound_send', function (direction) {
        stopAllSounds();
        const randomSound = Math.floor(Math.random() * 3);
        sounds[direction]?.play(randomSound);
    });

    // Game state management
    socket.on('game_over_send', function () {
        $('.game_over_box').addClass('active');
        gameOver = true;
        score = `Hey I have reached level ${level} at The Little Voice`;
        $('.best_score').html(`your best score : ${level}`);
        
        allSuccess++;
        if (allSuccess === 2) {
            level = 0;
            allSuccess = 0;
        }

        $('.try_again').click(function(event) {
            event.preventDefault();
            socket.emit('reset', currentRoom);
        });
    });

    socket.on('reset_send', function () {
        $('.game_over_box').removeClass('active');
        reset();
    });

    socket.on('success_send', function () {
        allSuccess++;
        
        if (allSuccess === 2) {
            level++;
            role = role === 'aveugle' ? 'guide' : 'aveugle';
            
            if (role === 'guide') {
                $('.all_map').removeClass('aveugle');
                $('.section_sound').fadeIn();
                $('#btn_repeat').fadeOut();
            } else {
                $('#btn_repeat').fadeIn();
            }
            
            reset();
            allSuccess = 0;
        }
    });

    // UI Controls
    $('#btn_repeat').click(function(event) {
        event.preventDefault();
        socket.emit('repeat', currentRoom);
        $(this).addClass('active')
               .one('animationend webkitAnimationEnd MSAnimationEnd oAnimationEnd', 
                    () => $(this).removeClass('active'));
    });

    socket.on('repeat_send', function () {
        $("<h1 class='center-e' id='show_repeat'>hein ?!</h1>")
            .appendTo('body').fadeIn(3000).fadeOut(3000);
    });

    // Help and menu system
    $('.toggle_help_button').click(function(event) {
        event.preventDefault();
        $('.toggle_help').toggleClass('toggle_help_actif');
    });

    $('.menu a').click(function(event) {
        event.preventDefault();
        $('.menu a').removeClass('active');
        $(this).addClass('active');
        
        currentMenu = '#' + this.innerHTML;
        $('#about, #scores, #instructions, #login').removeClass('active');
        $(currentMenu).addClass('active');
    });

    // Social sharing
    function popupCenter(url, title, width = 640, height = 320) {
        const windowLeft = window.screenLeft || window.screenX;
        const windowTop = window.screenTop || window.screenY;
        const windowWidth = window.innerWidth || document.documentElement.clientWidth;
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const popupLeft = windowLeft + windowWidth / 2 - width / 2;
        const popupTop = windowTop + windowHeight / 2 - height / 2;
        
        const popup = window.open(url, title, 
            `scrollbars=yes, width=${width}, height=${height}, top=${popupTop}, left=${popupLeft}`);
        popup.focus();
        return true;
    }

    $('.share_twitter, .submit_score').click(function(e) {
        e.preventDefault();
        const url = this.getAttribute('data-url');
        const text = this.classList.contains('submit_score') ? 
            `${document.title} ${score}` : document.title;
        const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&via=Serck_Timothee&url=${encodeURIComponent(url)}`;
        popupCenter(shareUrl, "Share on Twitter");
    });

    $('.share_facebook').click(function(e) {
        e.preventDefault();
        const url = this.getAttribute('data-url');
        const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        popupCenter(shareUrl, "Share on Facebook");
    });

    // Carousel controls
    if (typeof $.fn.owlCarousel === 'function') {
        $('.owl-carousel').owlCarousel({
            items: 1,
            margin: 10
        });

        $('#nextBtn_instructions, #nextBtn_about').click(function() {
            const carousel = $(this).attr('id').includes('instructions') ? '#owl-instructions' : '#owl-about';
            const isEnd = $(this).data('isEnd');
            
            if (!isEnd) {
                $(carousel).trigger('next.owl.carousel');
            } else {
                $(carousel).trigger('to.owl.carousel', [0, 0, true]);
            }
        });
    }

    // Video handling
    $('.btn_skip').click(() => {
        $('#loading').fadeOut();
        $('video').remove();
    });

    if ($('video').length > 0) {
        $("video").on("ended", () => $('#loading').fadeOut());
    }

    if ($('#wrong_width').css('display') === 'block') {
        $('video').remove();
    }

    // Ping/pong for connection monitoring
    socket.on('ping', () => {
        socket.emit('pong', { beat: 1 });
    });
});