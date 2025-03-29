class Register extends Phaser.Scene {
    constructor() {
        super({ key: 'register' });
    }

    init() {
        this.cameras.main.setBackgroundColor('#ffffff');
    }

    preload() {

    }

    create() {
        this.centerX = this.cameras.main.width / 2;
        this.centerY = this.cameras.main.height / 2;
        this.vaizdasImage = this.add.sprite(this.centerX, this.centerY, 'background');

        this.register = this.add.dom(this.centerX, this.centerY).createFromHTML(`
            <form id="register">
                <div>
                    <input type="text" id="uname" placeholder="Username" name="username" class="forminput" required><br>
                </div>
                <div>
                    <input type="text" id="email" placeholder="Email" name="email" class="forminput" required><br>
                </div>
                <div>
                    <input type="password" id="pswd" placeholder="Password" required><br>
                </div>
                <div>
                    <input type="password" id="repeatpswd" placeholder="Confirm Password" required><br>
                </div>
                <div>
                    <input type="submit" value="Register account">
                </div>
            </form>
            <p style="color:white">Already have an account? <span class="link-like" id="login">Sign in</span></p>
            <p style="color:white">Want to go back? <span class="link-like" id="back">Go back</span></p>
        `);

        const password = this.register.getChildByID('pswd');
        const confirmPassword = this.register.getChildByID('repeatpswd');
        const login = this.register.getChildByID('login');

        password.addEventListener('change', () => this.checkPassword(password, confirmPassword));
        confirmPassword.addEventListener('keyup', () => this.checkPassword(password, confirmPassword));
        login.addEventListener('click', this.loadLogin.bind(this));

        this.register.getChildByID('back').addEventListener('click', () => {
            this.scene.start('authenticate')
            this.scene.stop()
        })

        const registerForm = this.register.getChildByID('register');
        registerForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const emailPattern = /\S+@\S+\.\S+/
            const username = document.getElementById('uname').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('pswd').value;
            const repeatPassword = document.getElementById('repeatpswd').value;

            if (username.trim() === '' || email.trim() === '' || password.trim() === '') {
                alert('Please enter username, email, and password');
                this.removeInputs();
                return;
            }

            if (username.length > 20 || password.length > 20) {
                alert('Password and username cannot exceed 20 characters');
                this.removeInputs();
                return;
            }

            if (!emailPattern.test(email)) {
                alert('Please enter a valid email address');
                this.removeInputs();
                return;
            }

            if (password !== repeatPassword) {
                alert('Passwords do not match');
                this.removeInputs();
                return;
            }
            this.register.setVisible(false)
            this.sendVerificationEmail(username, email, password);
        });
    }

    update() {

    }

    removeInputs() {
        document.getElementById('uname').value = '';
        document.getElementById('email').value = '';
        document.getElementById('pswd').value = '';
        document.getElementById('repeatpswd').value = '';
    }

    checkPassword(password, confirmPassword) {
        if (password.value !== confirmPassword.value) {
            confirmPassword.setCustomValidity("Passwords Don't Match");
        } else {
            confirmPassword.setCustomValidity('');
        }
    }

    loadLogin() {
        this.scene.start('login');
        this.scene.stop();
    }

    sendVerificationEmail(username, email, password) {
        socket.emit('sendVerificationEmail', email)
        this.verificationForm = this.add.dom(this.centerX, this.centerY).createFromHTML(`
            <form id="verification">
                <div>
                    <input type="text" id="verificationCode" placeholder="Verification Code" required><br>
                </div>
                <div>
                    <input type="submit" value="Submit Verification Code">
                </div>
            </form>
            <p style="color:white">Did not get an email? <span class="link-like" id="resendCode">Resend code</span></p>
            <p style="color:white">Want to go back to registration form? <span class="link-like" id="back">Go back</span></p>
        `);

        this.verificationForm.getChildByID('resendCode').addEventListener('click', (event) => {
            event.preventDefault()
            socket.emit('sendVerificationEmail', email)
        })

        this.verificationForm.getChildByID('back').addEventListener('click', (event) => {
            event.preventDefault()
            this.removeInputs();
            this.verificationForm.setVisible(false)
            this.register.setVisible(true)
        })

        const verify = this.verificationForm.getChildByID('verification')
        verify.addEventListener('submit', (event) => {
            event.preventDefault()
            const code = document.getElementById('verificationCode').value
            if (code.trim() === '') {
                alert('Please enter code')
                document.getElementById('verificationCode').value = ''
            }
            this.verificationForm.setVisible(false)
            this.sendData(username, email, password, code)
        })
    }

    sendData(username, email, password, code) {
        const data = { username, email, password, code };
        socket.emit('register', data);
        socket.once('registerResponse', (response) => {
            if (response.success) {
                alert('Registration successful');
                this.scene.start('login');
                this.scene.stop();
            } else {
                alert('Registration failed: ' + response.error);
                this.removeInputs()
                this.verificationForm.setVisible(true)
            }
        });
    }

}

export default Register;
