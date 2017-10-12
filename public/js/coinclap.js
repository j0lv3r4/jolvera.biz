function CoinClap(options) {
    this.miner = options.miner;
    this.color = options.color || 'light';
    this.animationClass = this.color === 'light'
        ? '_coinclap-pulse-light'
        : '_coinclap-pulse-dark';
    this.imageSource = options.imageSource || 'https://image.flaticon.com/icons/svg/109/109638.svg';
    this.target = document.body;
    this.button = document.createElement('button');
    this.image = document.createElement('img');
}

CoinClap.prototype.init = function() {
    if (this.miner === undefined) {
        throw 'Could not use CoinHive. Maybe the user is running an adBlocker.';
    }
    this.button.setAttribute('id', '_coinclap-clap-button');
    this.button.setAttribute('class', '_coinclap-animated');
    this.image.setAttribute('id', '_coinclap-clap-img');
    this.image.setAttribute('src', this.imageSource);
    this.image.setAttribute('draggable', false);
    this.button.appendChild(this.image);
    this.target.appendChild(this.button);

    this.bindUIEvents();
}

CoinClap.prototype.bindUIEvents = function() {
    document.getElementById('_coinclap-clap-button').addEventListener('mousedown', this.minerStart.bind(this));

    document.getElementById('_coinclap-clap-button').addEventListener('mouseup', this.minerStop.bind(this));

    document.getElementById('_coinclap-clap-button').addEventListener('mouseleave', this.minerStop.bind(this));
}

CoinClap.prototype.minerStart = function() {
    this.miner.start();
    document.getElementById('_coinclap-clap-button').classList.add(this.animationClass);
}

CoinClap.prototype.minerStop = function(event) {
   this.miner.stop();
   document.getElementById('_coinclap-clap-button').classList.remove(this.animationClass);
}