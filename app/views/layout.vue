<template><!DOCTYPE html>
	<html>
		<head>
			<meta charset="utf-8">
			<title>Deezer Blindtest</title>
			<meta name="viewport" content="width=device-width" />
			<script src="https://unpkg.com/vue/dist/vue.js"></script>
			<script src="https://e-cdns-files.dzcdn.net/js/min/dz.js"></script>
			<script src="/socket.io/socket.io.js"></script>
			<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous">
			<link rel="stylesheet" href="/css/global.css" />
		</head>
		<body>
			<!--[if lt IE 10]>
				<p class="browsehappy">You are using an <strong>outdated</strong> browser. Please <a href="http://browsehappy.com/">upgrade your browser</a> to improve your experience.</p>
			<![endif]-->

			{{{app}}}
			<script src="/js/socket.js"></script>
			{{{script}}}
		</body>
	</html>
</template>

<script></script>