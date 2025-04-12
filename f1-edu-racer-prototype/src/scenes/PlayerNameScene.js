import Phaser from 'phaser';
import { PlayerService } from '../services/player';

export default class PlayerNameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PlayerNameScene' });
    }

    preload() {
        // Load any required assets
        // If using web fonts, make sure they're loaded before creating the scene
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Titillium+Web:wght@400;700&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }

    init() {
        // Initialize scene variables
        this.errorText = null;
    }

    create() {
        // Add background
        const bg = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x15151E);
        bg.setOrigin(0, 0);

        // Add title text
        const titleText = this.add.text(
            this.scale.width * 0.5,
            this.scale.height * 0.3,
            'ENTER YOUR NAME',
            {
                fontSize: '48px',
                fontFamily: 'Titillium Web',
                color: '#ffffff',
                align: 'center',
                fontWeight: 'bold'
            }
        ).setOrigin(0.5);

        // Create a div container for the input
        const inputContainer = document.createElement('div');
        inputContainer.style = `
            width: 600px;
            height: 60px;
            position: relative;
            margin: 0 auto;
        `;

        // Create the input element
        const inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.placeholder = 'Enter your name';
        inputElement.style = `
            width: 100%;
            height: 100%;
            padding: 12px 80px;
            border: 2px solid #00D2BE;
            background: #15151E;
            color: #888888;
            font-family: Titillium Web;
            font-size: 28px;
            text-align: center;
            outline: none;
            border-radius: 4px;
            box-sizing: border-box;
            transition: all 0.3s ease;
            letter-spacing: 1px;
            position: absolute;
            left: 60%;
            transform: translateX(-50%);
        `;

        // Add input focus effects
        inputElement.addEventListener('focus', () => {
            inputElement.style.borderColor = '#00E6D2';
            inputElement.style.color = '#ffffff';
            inputElement.style.boxShadow = '0 0 10px rgba(0, 210, 190, 0.3)';
        });

        inputElement.addEventListener('blur', () => {
            inputElement.style.borderColor = '#00D2BE';
            inputElement.style.color = '#888888';
            inputElement.style.boxShadow = 'none';
        });

        // Add the input to the container
        inputContainer.appendChild(inputElement);

        // Add the container to the game
        const element = this.add.dom(this.scale.width * 0.5, this.scale.height * 0.45, inputContainer);
        element.addListener('click');
        element.addListener('keyup');

        // Create start button with background
        const buttonBg = this.add.rectangle(
            this.scale.width * 0.5,
            this.scale.height * 0.65,
            300,
            70,
            0x00D2BE
        ).setOrigin(0.5);

        const startButton = this.add.text(
            this.scale.width * 0.5,
            this.scale.height * 0.65,
            'START RACE',
            {
                fontSize: '32px',
                fontFamily: 'Titillium Web',
                color: '#15151E',
                align: 'center',
                fontWeight: 'bold'
            }
        )
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

        // Button hover effects
        buttonBg.setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                buttonBg.setFillStyle(0x00E6D2);
                startButton.setColor('#000000');
                this.tweens.add({
                    targets: [buttonBg, startButton],
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 100
                });
            })
            .on('pointerout', () => {
                buttonBg.setFillStyle(0x00D2BE);
                startButton.setColor('#15151E');
                this.tweens.add({
                    targets: [buttonBg, startButton],
                    scaleX: 1,
                    scaleY: 1,
                    duration: 100
                });
            })
            .on('pointerdown', () => this.handleStartClick(inputElement));

        startButton.on('pointerdown', () => this.handleStartClick(inputElement));

        // Add keyboard enter handler
        this.input.keyboard.on('keydown-ENTER', () => this.handleStartClick(inputElement));

        // Focus the input element
        inputElement.focus();
    }

    async handleStartClick(inputElement) {
        const playerName = inputElement.value.trim();

        if (playerName) {
            try {
                // Create/update player in database
                const player = await PlayerService.upsertPlayer({
                    username: playerName
                });

                // Store both player name and ID
                localStorage.setItem('playerName', playerName);
                localStorage.setItem('playerId', player.id);

                // Start the qualifying scene
                this.scene.start('QualifyingScene');
            } catch (error) {
                console.error('Error creating player:', error);
                this.showError('Failed to create player. Please try again.');
            }
        } else {
            this.showError('Please enter your name');
        }
    }

    showError(message) {
        // Remove existing error message if any
        if (this.errorText) this.errorText.destroy();

        // Show new error message
        this.errorText = this.add.text(
            this.scale.width * 0.5,
            this.scale.height * 0.75,
            message,
            {
                fontSize: '20px',
                fontFamily: 'Titillium Web',
                color: '#E10600',
                align: 'center'
            }
        ).setOrigin(0.5);

        // Remove error message after 2 seconds
        this.time.delayedCall(2000, () => {
            if (this.errorText) this.errorText.destroy();
        });
    }
} 