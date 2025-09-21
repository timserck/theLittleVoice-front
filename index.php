<?php include_once("inc/meta.inc.php"); ?>

<title>The little voice</title>
<meta name="description" content="game by Timothée Serck for his final exam" />

</head>

<body>
	<svg id="background_svg">
		<defs>
			<pattern patternTransform="rotate(45)" id="pattern" x="0" y="0" width="100" height="100"
				patternUnits="userSpaceOnUse">
				<image xlink:href="./imgs/pattern_bw_128-90.png" x="0" y="0" width="100" height="100" TRAN></image>
			</pattern>
		</defs>
		<rect width="100%" height="100%" fill="url(#pattern)" />
	</svg>
	<?php include_once("inc/analyticstracking.inc.php"); ?>

	<?php include_once("inc/view/size_error.view.php"); ?>
	<?php include_once("inc/view/loadingVideo.view.php"); ?>

	<section class="section_login">

		<?php include_once("inc/view/instructions.view.php"); ?>
		<?php include_once("inc/view/credits.view.php"); ?>
		<?php include_once("inc/view/login.view.php"); ?>

		<nav class='menu'>
			<ul>
				<li>
					<a class='active' href="#">login</a>
				</li>
				<li>
					<a href="#">instructions</a>
				</li>
				<li>
					<a href="#">about</a>
				</li>
			</ul>
		</nav>
	</section>
	<?php include_once("inc/view/wait.view.php"); ?>

	<?php include_once("inc/view/game.view.php"); ?>

	</main>

	<?php include_once("inc/footer.inc.php"); ?>