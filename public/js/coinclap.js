function CoinClap(options) {
    this.target = options.target || document.body;
    this.color = options.color || 'black';
    this.siteKey = options.siteKey || '';
    this.button = document.createElement('button');
    this.image = document.createElement('img');
}

CoinClap.prototype.init = function() {
    this.button.setAttribute('id', '_coinclap-clap-button');
    this.button.setAttribute('class', '_coinclap-animated');
    this.image.setAttribute('id', '_coinclap-clap-img');
    this.image.setAttribute('src', 'https://image.flaticon.com/icons/svg/109/109638.svg');
    this.image.setAttribute('draggable', false);
    this.button.appendChild(this.image);
    this.target.appendChild(this.button);

    this.miner = new CoinHive.Anonymous(this.siteKey);
    this.bindUIEvents();
}

CoinClap.prototype.bindUIEvents = function() {
    document.getElementById('_coinclap-clap-button').addEventListener('mousedown', function() {
        this.miner.start();
        this.addAnimationClass();
    }.bind(this));

    document.getElementById('_coinclap-clap-button').addEventListener('mouseup', function() {
        this.miner.stop();
        this.removeAnimationClass();
    }.bind(this));

    document.getElementById('_coinclap-clap-button').addEventListener('mouseout', this.removeAnimationClass);
}

CoinClap.prototype.addAnimationClass = function() {
    document.getElementById('_coinclap-clap-button').classList.add('_coinclap-pulse');
}

CoinClap.prototype.removeAnimationClass = function(event) {
   document.getElementById('_coinclap-clap-button').classList.remove('_coinclap-pulse');
}