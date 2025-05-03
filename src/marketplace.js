import SettingsButtonWithPanel from './options.js';

class Marketplace extends Phaser.Scene {
  constructor() {
    super({ key: 'marketplace' });
    this.player = null;
    this.objects = null;
    this.popupText = null;
    this.purchaseText = null;
    this.map = null;
    this.interactionCooldown = false;
    this.currentObject = null;
    this.isInteracting = false;
    this.unlockedWeapons = [];
    this.unlockedGrenades = [];
    this.unlockedSkins = [];
  }

  init(data) {
    this.username = data.username;
  }

  preload() {

  }

  create() {
    this.fetchInfo();
    this.getUnlockedItems();
    this.fetchMarketplaceItems();
    this.setupScene();
    this.setupInputEvents();
    this.setupProgressBar();
    this.setupPaymentListener();
    this.settingsButton = new SettingsButtonWithPanel(this, 1890, 90);
    this.bKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);
    this.setupSkinMarketplaceUI();

  }

  setupScene() {
    this.centerX = this.cameras.main.width / 2;
    this.centerY = this.cameras.main.height / 2;

    const map1 = this.make.tilemap({ key: "map1", tileWidth: 32, tileHeight: 32 });
    const tileset4 = map1.addTilesetImage("TX Tileset Grass", "tiles4");
    const tileset1 = map1.addTilesetImage("TX Plant", "tiles1");
    const tileset3 = map1.addTilesetImage("TX Struct", "tiles3");
    const tileset5 = map1.addTilesetImage("TX Tileset Stone Ground", "tiles5");
    const tileset6 = map1.addTilesetImage("TX Tileset Wall", "tiles6");
    const tileset2 = map1.addTilesetImage("TX Props", "tiles2");
    const layer1 = map1.createLayer("Tile Layer 1", [tileset1, tileset2, tileset3, tileset4, tileset5, tileset6], 0, 0);

    this.player = this.physics.add.sprite(247, 517, 'idleDown').setScale(3);
    this.player.setCollideWorldBounds(true);

    this.gunObjects = this.physics.add.staticGroup();
    this.gun1Object = this.gunObjects.create(432, 400, 'Pistol');
    this.gun2Object = this.gunObjects.create(785, 400, 'Shotgun');
    this.gun3Object = this.gunObjects.create(1140, 400, 'AR');
    this.gun4Object = this.gunObjects.create(1460, 400, 'Sniper');

    this.skinObjects = this.physics.add.staticGroup();
    this.skin1Objects = this.skinObjects.create(332, 250, 'skin1_pistol');
    this.skin2Objects = this.skinObjects.create(685, 250, 'skin1_shotgun');
    this.skin3Objects = this.skinObjects.create(1040, 250, 'skin1_ar');
    this.skin4Objects = this.skinObjects.create(1360, 250, 'skin1_sniper');
    
    



    this.gunObjects.getChildren().forEach(object => {
      object.setScale(1.5);
    });

    this.skinObjects.getChildren().forEach(object => {
      object.setScale(1.5);
    });

    this.grenadeObjects = this.physics.add.staticGroup();
    this.grenade1Object = this.grenadeObjects.create(785, 650, 'smokeGrenade');
    this.grenade2Object = this.grenadeObjects.create(1110, 650, 'grenade');

    this.grenadeObjects.getChildren().forEach(object => {
      object.setScale(3);
    });

    this.popupText = this.add.text(100, 100, '', { fontFamily: 'Arial', fontSize: 24, color: '#ffffff' });
    this.popupText.setVisible(false);

    this.purchaseText = this.add.text(this.centerX, this.centerY, '', { fontFamily: 'Arial', fontSize: 64, color: '#ffffff', align: 'center' });
    this.purchaseText.setOrigin(0.5, 0.5);
    this.purchaseText.setVisible(false);

    this.physics.add.overlap(this.player, this.gunObjects, this.interactWithObject, null, this);
    this.physics.add.overlap(this.player, this.grenadeObjects, this.interactWithObject, null, this);
    this.physics.add.overlap(this.player, this.skinObjects, this.interactWithObject, null, this);


    this.coinsText = this.add.text(960, 30, 'Coins: ', { fontFamily: 'Arial', fontSize: 24, color: '#ffffff' });
    this.plusButton = this.add.sprite(1120, 40, 'plus').setScale(0.05).setInteractive({ useHandCursor: true });
    this.plusButton.on('pointerdown', () => {
      this.showCoinPurchaseOptions(this.username);
    });

    this.exitButton = this.add.sprite(1890, 30, 'quitButton').setScale(0.1)
        this.exitButton.setInteractive({ useHandCursor: true })
        this.exitButton.on('pointerdown', () => {
            const exitPromptContainer = document.getElementById('exit-prompt-container');
            const exitYesButton = document.getElementById('exitYesButton');
            const exitNoButton = document.getElementById('exitNoButton');

            const handleExitYes = () => {
                this.shutdown()
                this.scene.start('mainMenu');
                this.scene.stop();
                cleanupEventListeners();
                hideExitPrompt();
            };
        
            const handleExitNo = () => {
                cleanupEventListeners();
                hideExitPrompt();
            };
        
            const cleanupEventListeners = () => {
                exitYesButton.removeEventListener('click', handleExitYes);
                exitNoButton.removeEventListener('click', handleExitNo);
            };
            const hideExitPrompt = () => {
                overlay.style.display = 'none';
                exitPromptContainer.style.display = 'none';
            };
            exitPromptContainer.style.display = 'block';
            exitYesButton.addEventListener('click', handleExitYes);
            exitNoButton.addEventListener('click', handleExitNo);
        });
  }

  showCoinPurchaseOptions(username) {
    const options = [
      { label: '100 Coins - €1', amount: 100, cost: 1 },
      { label: '500 Coins - €4', amount: 500, cost: 4 },
      { label: '1000 Coins - €7', amount: 1000, cost: 7 },
    ];

    const coinPurchaseContainer = document.getElementById('coin-purchase-container');
    const coinOptions = document.getElementById('coin-options');
    coinOptions.innerHTML = '';

    options.forEach(option => {
      const optionButton = document.createElement('div');
      optionButton.className = 'prompt-button';
      optionButton.textContent = option.label;
      optionButton.addEventListener('click', async () => {
        try {
          const response = await fetch('/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: option.amount, username })
          });
          const { clientSecret } = await response.json();
          const coins = option.amount;
          const cost = option.cost;
          this.showPaymentForm(clientSecret, coins, cost);
          coinPurchaseContainer.style.display = 'none'; // Hide the prompt after selection
        } catch (err) {
          console.error('Error creating payment intent:', err);
        }
      });
      coinOptions.appendChild(optionButton);
    });

    const coinCancelButton = document.getElementById('coinCancelButton');
    coinCancelButton.addEventListener('click', () => {
      coinPurchaseContainer.style.display = 'none';
    });

    coinPurchaseContainer.style.display = 'block';
  }

  showPaymentForm(clientSecret, coins, cost) {
    // Clear any previous instances of the payment form
    const existingForm = document.getElementById('payment-form');
    if (existingForm) {
      existingForm.remove();
    }

    const formHtml = `
      <div id="payment-form">
        <form id="payment-element-form">
          <div id="coin-details" style="margin-bottom: 10px; font-size: 24px;">
            <div>Coins: ${coins}</div>
            <div>Cost: €${cost.toFixed(2)}</div>
          </div>
          <div id="payment-element"></div>
          <button id="submit-button" class="prompt-button">Pay</button>
          <button id="cancel-button" class="prompt-button" type="button">Cancel</button>
          <div id="error-message"></div>
        </form>
      </div>
    `;
    const paymentForm = this.add.dom(400, 300).createFromHTML(formHtml);

    this.time.delayedCall(100, () => {
      this.setupStripeElements(clientSecret, coins);
    });

    const cancelButton = document.getElementById('cancel-button');
    cancelButton.addEventListener('click', () => {
      this.clearPaymentForm();
    });
  }

  setupStripeElements(clientSecret, amount) {
    const stripe = Stripe('pk_test_51PJtjWP7nzuSu7T7Q211oUu5LICFrh0QjI6hx4KiOAjZSXXhe0HgNlImYdEdPDAa5OGKG4y8hyR1B0SuiiP3okTP00OOp963M1');
    const options = {
      layout: {
        type: 'accordion',
        defaultCollapsed: false,
        radios: false,
        spacedAccordionItems: true
      },
      wallets: {
        applePay: 'never',
        googlePay: 'never'
      }
    };
    const appearance = {
      theme: 'stripe',
    };
    const elements = stripe.elements({ clientSecret, appearance });
    const paymentElement = elements.create('payment', options);

    // Clear any child nodes in the payment element container
    const paymentElementContainer = document.getElementById('payment-element');
    while (paymentElementContainer.firstChild) {
      paymentElementContainer.removeChild(paymentElementContainer.firstChild);
    }

    paymentElement.mount('#payment-element');

    const form = document.getElementById('payment-element-form');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {},
        redirect: 'if_required'
      });

      if (error) {
        document.getElementById('error-message').textContent = error.message;
      } else {
        const event = new CustomEvent('payment-success', { detail: { username: this.username, amount } });
        window.dispatchEvent(event);
      }
    });
  }

  async handlePaymentSuccess(username, amount) {
    console.log(`Payment successful for user: ${username}`);
    try {
      const response = await fetch('/update-coins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, amount })
      });
      const data = await response.json();
      if (data.success) {
        this.coinsText.setText(`Coins: ${data.coins}`);
      } else {
        console.error('Failed to update coins.');
      }
    } catch (error) {
      console.error('Error updating coins:', error);
    }
  }

  clearPaymentForm() {
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
      paymentForm.style.display = 'none';
      const paymentElementForm = document.getElementById('payment-element-form');
      if (paymentElementForm) {
        paymentElementForm.reset();
      }
    }
  }

  setupInputEvents() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.w = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.a = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.s = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.d = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    socket.on('purchaseConfirmed', (data) => {
      const { weaponId, grenadeId, skinId } = data;
      if (weaponId) {
        this.unlockedWeapons.push(weaponId);
      } else if (grenadeId) {
        this.unlockedGrenades.push(grenadeId);
      } else if (skinId) {
        this.unlockedSkins.push(skinId);
      }
      this.showSuccessMessage();
    });
    
  }

  update() {
    this.updatePlayerMovement();
  }

  updatePlayerMovement() {
    if (!this.player) return;
    const player = this.player;
    let moving = false;
    let direction = '';

    if (this.w.isDown) {
      moving = true;
      direction += 'Up';
      player.y -= 2;
    } else if (this.s.isDown) {
      moving = true;
      direction += 'Down';
      player.y += 2;
    }

    if (this.a.isDown) {
      moving = true;
      direction += 'Left';
      player.x -= 2;
    } else if (this.d.isDown) {
      moving = true;
      direction += 'Right';
      player.x += 2;
    }

    if (moving) {
      const animationName = `Walk${direction}`;
      player.anims.play(animationName, true);
      this.lastDirection = direction;
    } else {
      let idleAnimationName;
      if (this.lastDirection) {
          if (this.lastDirection.includes('Up')) {
              idleAnimationName = 'IdleUp';
          } else if (this.lastDirection.includes('Down')) {
              idleAnimationName = 'IdleDown';
          } else if (this.lastDirection.includes('Left') || this.lastDirection.includes('Right')) {
              idleAnimationName = this.lastDirection.includes('Left') ? 'IdleLeft' : 'IdleRight';
          } else {
              idleAnimationName = 'IdleDown';
          }
      } else {
          idleAnimationName = 'IdleDown';
      }
      player.anims.play(idleAnimationName, true);
   }
  }

  interactWithObject(player, object) {
    const distance = Phaser.Math.Distance.Between(player.x, player.y, object.x, object.y);
  
    if (distance < 50 && !this.interactionCooldown && this.marketplaceItems) {
      const textureKey = object.texture.key;
  
      const item = this.marketplaceItems.find(item => item.texture_key === textureKey);
      if (!item) return;
  
      const { item_id, item_type, name, cost, required_level } = item;
  
      const alreadyUnlocked =
        (item_type === 'weapon' && this.unlockedWeapons.includes(item_id)) ||
        (item_type === 'grenade' && this.unlockedGrenades.includes(item_id)) ||
        (item_type === 'skin' && this.unlockedSkins?.includes(item_id));
  
      this.currentObject = {
        weaponId: item_type === 'weapon' ? item_id : 0,
        grenadeId: item_type === 'grenade' ? item_id : 0,
        skinId: item_type === 'skin' ? item_id : 0,
        itemName: name,
        requiredLevel: required_level,
        cost
      };
  
      this.isInteracting = true;
  
      if (alreadyUnlocked) {
        this.popupText.setText(`${name} is already unlocked.`);
      } else if (this.level >= required_level) {
        this.popupText.setText(`Unlock ${name} for ${cost} coins. Press E to buy.`);
        if (this.eKey.isDown) this.showPurchasePrompt();
      } else {
        this.popupText.setText(`Level ${required_level} required to unlock ${name}.`);
      }
  
      this.popupText.setPosition(player.x - 50, player.y - 50);
      this.popupText.setVisible(true);
    } else {
      this.popupText.setVisible(false);
      this.currentObject = null;
      this.isInteracting = false;
    }
  }
  
  
  

  showPurchasePrompt() {
    const promptContainer = document.getElementById('weapon-purchase-container');
    promptContainer.style.display = 'block';

    const yesButton = document.getElementById('purchaseYesButton');
    const noButton = document.getElementById('purchaseNoButton');

    const handleYesClick = () => {
      this.buyItem();
      promptContainer.style.display = 'none';
      yesButton.removeEventListener('click', handleYesClick);
      noButton.removeEventListener('click', handleNoClick);
    };

    const handleNoClick = () => {
      promptContainer.style.display = 'none';
      yesButton.removeEventListener('click', handleYesClick);
      noButton.removeEventListener('click', handleNoClick);
    };

    yesButton.addEventListener('click', handleYesClick);
    noButton.addEventListener('click', handleNoClick);
  }

  showSuccessMessage() {
    const successContainer = document.getElementById('purchase-success-container');
    successContainer.style.display = 'block';

    const closeButton = document.getElementById('successCloseButton');
    
    const handleCloseClick = () => {
      successContainer.style.display = 'none';
      closeButton.removeEventListener('click', handleCloseClick);
    };

    closeButton.addEventListener('click', handleCloseClick);

    this.time.addEvent({ delay: 2000, callback: () => {
      if (successContainer.style.display !== 'none') {
        successContainer.style.display = 'none';
        closeButton.removeEventListener('click', handleCloseClick);
      }
    } });
  }

  buyItem() {
    if (!this.isInteracting) return;
  
    const { weaponId, grenadeId, skinId, itemName, requiredLevel, cost } = this.currentObject;
  
    if (this.coins >= cost) {
      this.coins -= cost;
      this.coinsText.setText(`Coins: ${this.coins}`);
  
      if (weaponId) {
        socket.emit('buyGun', { socket: socket.id, weaponId });
      } else if (grenadeId) {
        socket.emit('buyGrenade', { socket: socket.id, grenadeId });
      } else if (skinId) {
        socket.emit('buySkin', { socket: socket.id, skinId });
  
        const container = document.getElementById('skin-marketplace-container');
        if (container && container.style.display !== 'none') {
          setTimeout(() => {
            this.fetchSkinListings(1, true);
            this.getUnlockedItems();
          }, 300);
        }
      }
  
      this.showSuccessMessage();
  
    } else {
      this.purchaseText.setText(`Not enough coins to buy ${itemName}.`);
      this.purchaseText.setStyle({ fontSize: '64px', fill: '#ff0000', align: 'center' });
      this.purchaseText.setVisible(true);
      this.time.addEvent({ delay: 2000, callback: () => this.purchaseText.setVisible(false) });
    }
  
    this.currentObject = null;
    this.isInteracting = false;
  }

  setupProgressBar() {
    this.barWidth = 200;
    this.barHeight = 20;
    this.barX = 960;
    this.barY = 70;

    this.progressBarBackground = this.add.graphics();
    this.progressBarBackground.fillStyle(0x000000, 1);
    this.progressBarBackground.fillRect(this.barX, this.barY, this.barWidth, this.barHeight);

    this.progressBar = this.add.graphics();

    this.currentLevelText = this.add.text(this.barX - 80, this.barY - 2, 'Level ', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff'
    });

    this.nextLevelText = this.add.text(this.barX + this.barWidth + 10, this.barY - 2, 'Level ', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff'
    });

    this.percentageText = this.add.text(this.barX + this.barWidth / 2, this.barY - 2, '0%', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5, 0);

    this.updateProgressBar(0, 1); //default
  }

  updateProgressBar(percentage, level) {
    this.progressBar.clear();
    this.progressBar.fillStyle(0x00ff00, 1);
    this.progressBar.fillRect(this.barX, this.barY, this.barWidth * percentage, this.barHeight);

    this.currentLevelText.setText(`Level ${level}`);
    this.nextLevelText.setText(`Level ${level + 1}`);
    this.percentageText.setText(`${Math.round(percentage * 100)}%`);
  }

  setupPaymentListener() {
    this.paymentSuccessHandler = (event) => {
      const { username, amount } = event.detail;
      this.handlePaymentSuccess(username, amount);
      this.clearPaymentForm();
    };
    window.addEventListener('payment-success', this.paymentSuccessHandler);
  }

  shutdown() {
    window.removeEventListener('payment-success', this.paymentSuccessHandler);
  }

  fetchInfo() {
    fetch(`/get-info?username=${encodeURIComponent(this.username)}`)
      .then(response => response.json())
      .then(data => {
        this.coins = data.coins
        this.level = data.level
        console.log(this.coins)
        this.coinsText.setText(`Coins: ${this.coins}`);
        
        const experiencePercentage = data.xp / (data.level * 100);
        this.updateProgressBar(experiencePercentage, this.level);
      })
      .catch(error => console.error('Error fetching info:', error));
  }

  getUnlockedItems() {
    fetch(`/get-weapons?username=${encodeURIComponent(this.username)}`)
      .then(response => response.json())
      .then(data => {
        this.unlockedWeapons = data.weapons || [];
        this.unlockedGrenades = data.grenades || [];
        this.unlockedSkins = data.skins || [];
      })
      .catch(error => console.error('Error fetching unlocked items:', error));
  }
  

  fetchMarketplaceItems() {
    fetch('/get-marketplace-items')
      .then(res => res.json())
      .then(data => {
        this.marketplaceItems = data;
      })
      .catch(err => console.error('Failed to load marketplace items:', err));
  }

  setupSkinMarketplaceUI() {
    const skinMarketplaceContainer = document.getElementById('skin-marketplace-container');
    const closeBtn = document.getElementById('close-skin-marketplace');
    const listButton = document.getElementById('list-skin-button');
    const listingsDiv = document.getElementById('skin-listings');
  
    this.currentPage = 1;
    this.skinMarketplaceVisible = false;
  
    closeBtn.addEventListener('click', () => {
      skinMarketplaceContainer.style.display = 'none';
      this.skinMarketplaceVisible = false;
      skinMarketplaceContainer.removeEventListener('scroll', this.scrollHandler);
    });
  
    if (listButton && !listButton.dataset.listenerAdded) {
      listButton.addEventListener('click', () => {
        const skinId = parseInt(document.getElementById('owned-skins').value);
        const price = parseInt(document.getElementById('listing-price').value);
        this.listSkinForSale(skinId, price);
      });
      listButton.dataset.listenerAdded = 'true';
    }
  
    this.input.keyboard.on('keydown-B', () => {
      if (this.skinMarketplaceVisible) {
        skinMarketplaceContainer.style.display = 'none';
        this.skinMarketplaceVisible = false;
        skinMarketplaceContainer.removeEventListener('scroll', this.scrollHandler);
      } else {
        this.currentPage = 1;
        this.fetchSkinListings(this.currentPage, true);
        this.populateOwnedSkins();
        skinMarketplaceContainer.style.display = 'block';
        this.skinMarketplaceVisible = true;
  
        this.scrollHandler = () => {
          const scrollBottom = skinMarketplaceContainer.scrollTop + skinMarketplaceContainer.clientHeight;
          const scrollHeight = skinMarketplaceContainer.scrollHeight;
  
          if (scrollBottom >= scrollHeight - 50) {
            this.currentPage++;
            this.fetchSkinListings(this.currentPage, false);
          }
        };
  
        skinMarketplaceContainer.addEventListener('scroll', this.scrollHandler);
      }
    });
  }
  
  

  populateOwnedSkins() {
    const skinSelect = document.getElementById('owned-skins');
    skinSelect.innerHTML = '';
  
    fetch('/get-all-skin-listings')
      .then(res => res.json())
      .then(listings => {
        const listedSkinIds = listings
          .filter(listing => listing.seller_name === this.username)
          .map(listing => listing.skin_id);
  
        return fetch(`/get-weapons?username=${encodeURIComponent(this.username)}`)
          .then(res => res.json())
          .then(data => {
            const ownedSkins = data.skins || [];
            const unlistedSkins = ownedSkins.filter(skinId => !listedSkinIds.includes(skinId));
  
            if (unlistedSkins.length === 0) {
              const option = document.createElement('option');
              option.disabled = true;
              option.textContent = 'No skins available';
              skinSelect.appendChild(option);
              return;
            }
  
            unlistedSkins.forEach(skinId => {
              fetch(`/get-skin-details?skinId=${skinId}`)
                .then(res => res.json())
                .then(skin => {
                  const option = document.createElement('option');
                  option.value = skinId;
                  option.textContent = `${skin.skin_name} (${skin.rarity})`;
                  skinSelect.appendChild(option);
                });
            });
          });
      })
      .catch(err => console.error('Error populating owned skins:', err));
  }
  
  
  
  listSkinForSale(skinId, price) {
    if (!skinId || !price || price < 1) {
      alert('Please select a skin and enter a valid price.');
      return;
    }
  
    fetch('/list-skin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: this.username, skinId, price })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.showCustomPrompt(`Listed skin for ${price} coins!`);
          this.fetchSkinListings(1, true);
          this.getUnlockedItems();
          this.populateOwnedSkins();
        } else {
          this.showCustomPrompt(`Listing failed: ${data.error || 'Unknown error.'}`);
        }
      })
      .catch(err => {
        console.error('Error listing skin:', err);
        alert('Listing failed due to a server error.');
      });
  }
  
  
  
  
  fetchSkinListings(page = 1, replace = false) {
    fetch(`/get-skin-listings?page=${page}&limit=10`)
      .then(res => res.json())
      .then(listings => {
        const listingsDiv = document.getElementById('skin-listings');
        if (replace) listingsDiv.innerHTML = '';
  
        if (listings.length === 0 && page === 1) {
          listingsDiv.innerHTML = '<p>No listings available.</p>';
          return;
        }
  
        listings.forEach(item => {
          const isOwner = item.seller_name === this.username;
  
          const listingElement = document.createElement('div');
          listingElement.style.border = '1px solid #ccc';
          listingElement.style.borderRadius = '8px';
          listingElement.style.margin = '10px';
          listingElement.style.padding = '10px';
          listingElement.style.backgroundColor = '#1e1e1e';
  
          listingElement.innerHTML = `
            <p><strong>Skin:</strong> ${item.skin_name}</p>
            <p><strong>Rarity:</strong> ${item.rarity}</p>
            <p><strong>Price:</strong> ${item.price} Coins</p>
            <p><strong>Seller:</strong> ${item.seller_name}</p>
            <img src="/skins/${item.image_url}.png" alt="${item.skin_name}" width="100" height="100" loading="lazy">
          `;
  
          if (!isOwner) {
            const buyButton = document.createElement('button');
            buyButton.textContent = 'Buy';
            buyButton.className = 'prompt-button';
            buyButton.addEventListener('click', () => {
              this.buySkinListing(item.listing_id);
            });
            listingElement.appendChild(buyButton);
          } else {
            const priceInput = document.createElement('input');
            priceInput.type = 'number';
            priceInput.min = 1;
            priceInput.value = item.price;
            priceInput.style.width = '60px';
            priceInput.style.marginRight = '5px';
  
            const updateBtn = document.createElement('button');
            updateBtn.textContent = 'Update Price';
            updateBtn.className = 'prompt-button';
            updateBtn.addEventListener('click', () => {
              const newPrice = parseInt(priceInput.value);
              if (newPrice < 1) return alert('Invalid price.');
              this.updateSkinListing(item.listing_id, newPrice);
            });
  
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel Listing';
            cancelBtn.className = 'prompt-button';
            cancelBtn.addEventListener('click', () => {
              this.cancelSkinListing(item.listing_id);
            });
  
            listingElement.appendChild(document.createElement('br'));
            listingElement.appendChild(priceInput);
            listingElement.appendChild(updateBtn);
            listingElement.appendChild(cancelBtn);
          }
  
          listingsDiv.appendChild(listingElement);
        });
      })
      .catch(err => {
        console.error('Failed to fetch listings:', err);
        const listingsDiv = document.getElementById('skin-listings');
        listingsDiv.innerHTML = '<p style="color:red;">Failed to load listings. Please try again later.</p>';
      });
  }
  
  
  
  
  buySkinListing(listingId) {
    fetch('/buy-listed-skin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyerName: this.username, listingId: parseInt(listingId) })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (this.unlockedSkins.includes(data.skinId)) {
            this.showCustomPrompt('You already own this skin.');
          } else {
            this.showCustomPrompt('Skin purchased successfully! The skin has been added to your inventory.');
            document.getElementById('skin-marketplace-container').style.display = 'none';
            this.fetchInfo();
            this.getUnlockedItems();
          }
        } else {
          this.showCustomPrompt(`Purchase failed: ${data.error || 'Unknown error'}`);
        }
      })
      .catch(err => {
        console.error('Error purchasing skin:', err);
        this.showCustomPrompt('Purchase failed due to server error.');
      });
  }
  

  updateSkinListing(listingId, newPrice) {
    fetch('/update-skin-listing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId, price: newPrice, username: this.username })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.showCustomPrompt('Listing updated.');
          this.fetchSkinListings(1, true);
          this.populateOwnedSkins();
        } else {
          this.showCustomPrompt(`Update failed: ${data.error}`);
        }
      })
      .catch(err => {
        console.error('Error updating listing:', err);
        alert('Update failed due to server error.');
      });
  }
  
  
  cancelSkinListing(listingId) {
    fetch('/cancel-skin-listing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId, username: this.username })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.showCustomPrompt('Listing removed.');
          this.fetchSkinListings(1, true);
          this.getUnlockedItems();
          this.populateOwnedSkins();
        } else {
          this.showCustomPrompt(`Cancel failed: ${data.error}`);
        }
      })
      .catch(err => console.error('Error canceling listing:', err));
  }

  showCustomPrompt(message, closeCallback) {
    const successContainer = document.getElementById('purchase-success-container');
    const successMessage = document.getElementById('purchase-success-message');
  
    successMessage.innerHTML = `
      <div class="prompt-message">${message}</div>
      <div class="prompt-button" id="successCloseButton">Close</div>
    `;
  
    successContainer.style.display = 'block';
  
    const closeButton = document.getElementById('successCloseButton');
  
    const handler = () => {
      successContainer.style.display = 'none';
      closeButton.removeEventListener('click', handler);
      if (typeof closeCallback === 'function') {
        closeCallback();
      }
    };
  
    closeButton.addEventListener('click', handler);
  }
  
  
}

export default Marketplace;
