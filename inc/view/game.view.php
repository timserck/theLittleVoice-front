<main class="main">
	<div class='center-e' id='score_current'></div>

	<div id="role_guide">
		<svg>
			<use xlink:href='./imgs/sprites.svg#instructions_eye'></use>
		</svg>
		<span class='clearfix'>
			<h1> Guide </h1>
			<p>Guide with sound your blindless friend to exit.</p>
		</span>

	</div>

	<div id="role_aveugle">
		<svg>
			<use xlink:href='./imgs/sprites.svg#instructions_hand'></use>
		</svg>
		<span class='clearfix'>
			<h1> Blind </h1>
			<p>Move to the exit with the sound of your Guide.</p>
		</span>

	</div>




	<div class="all_map center-e">
		<ul class='section_sound'>
			<a class="sound_left" href="#"> send sound left</a>
			<a class="sound_right" href="#">send sound right</a>
			<a class="sound_up" href="#">send sound up</a>
			<a class="sound_down" href="#">send sound down</a>
		</ul>


		<div class="perso">
			<div class="shadow"></div>
		</div>
		<div class="ennemi"></div>
	</div>

	<div class="center-e toggle_help">
		<div>

			<svg>
				<use xlink:href='./imgs/sprites.svg#logo'></use>
			</svg>


			<h1>The little voice<span>Help your blind coop to escape</span></h1>

			<span class='warning'>

				<span class="fa-stack fa-lg">
					<i class="fa fa-circle fa-stack-2x"></i>
					<i class="fa fa-headphones fa-stack-1x fa-inverse"></i>
				</span> an headphone is needed to play

			</span>
			<button class="toggle_help_button start_game btn btn_primary btn_blue">start</a>
		</div>
	</div>

	<div class='game_over_box center-e'>
		<div>
			<h1>Game Over<span class='best_score'></span></h1>
			<svg class='game_over_svg'>
				<use xlink:href='./imgs/sprites.svg#game_over'></use>
			</svg>

			<a href='/' class='try_again btn btn_primary btn_green'>Try again</a>
			<button title='share with twitter' class='submit_score btn btn_primary btn_blue' data-url='/'>
				<svg class='icon'>
					<use xlink:href='./imgs/sprites.svg#icon-twitter'></use>
				</svg>
				share your score
			</button>
		</div>
	</div>


	<div class='restart_box center-e'>
		<div>
			<svg class='game_over_svg'>
				<use xlink:href='./imgs/sprites.svg#game_over'></use>
			</svg>
			<h1>Your coop left the game<span class='best_score'></span></h1>
			<button class="restart btn btn_primary btn_blue">restart game</button>
		</div>
	</div>

	<a id='btn_repeat' class='btn btn_primary btn_blue btn_middle'>repeat sound please</a>