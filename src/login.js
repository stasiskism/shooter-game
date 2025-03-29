class Login extends Phaser.Scene {
    constructor() {
        super({ key: 'login'});
    }
    init() {
        //this.cameras.main.setBackgroundColor('#ffffff')
    }
    preload() {
    }
    create() {
        this.centerX = this.cameras.main.width / 2;
        this.centerY = this.cameras.main.height / 2;
        this.add.sprite(this.centerX, this.centerY, 'background');
        const login = this.add.dom(this.centerX, this.centerY).createFromHTML(`
            <form id="login">
                <div>
                    <input type="text" id="uname" placeholder="Username" name="username" class="forminput" required>
                </div>
                <div>
                    <input type="password" id="pswd" placeholder="Password" required>
                </div>
                <div>
                    <input type="submit" value="Login">
                </div>
            </form>
            <p style="color:white">Not a member? <span class="link-like" id="register">Sign up now</span></p>
            <p style="color:white">Forgot your password? <span class="link-like" id="forgotPassword">Reset it here</span></p>
            <p style="color:white">Want to go back? <span class="link-like" id="back">Go back</span></p>
        `);

        login.getChildByID('back').addEventListener('click', () => {
            this.scene.start('authenticate')
            this.scene.stop()
        })

        const register = login.getChildByID('register');
        register.addEventListener('click', this.loadRegister.bind(this));

        const loginForm = login.getChildByID('login')
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault()

            const username = document.getElementById('uname').value
            const password = document.getElementById('pswd').value

            if (username.trim() === '' || password.trim() === '') {
                alert('Please enter username and password')
                this.removeInputs()
                return;
            }

            this.sendData(username, password)

        })

        const resetPassword = login.getChildByID('forgotPassword')
        resetPassword.addEventListener('click', () => {
            login.setVisible(false)
            this.resetPasswordForm = this.add.dom(this.centerX, this.centerY).createFromHTML(`
                <form id="reset">
                    <div>
                        <input type="text" id="email" placeholder="Email address" required>
                    </div>
                    <div>
                        <input type="submit" value="Submit Email Address">
                    </div>
                </form>
                <p style="color:white">Want to go back to login form? <span class="link-like" id="back">Go back</span></p>
            `);

        this.resetPasswordForm.getChildByID('back').addEventListener('click', (event) => {
            event.preventDefault()
            this.removeInputs();
            this.resetPasswordForm.setVisible(false)
            login.setVisible(true)
        })

        const emailPattern = /\S+@\S+\.\S+/
        
        const resetForm = this.resetPasswordForm.getChildByID('reset')
        resetForm.addEventListener('submit', (event) => {
            event.preventDefault()
            const email = document.getElementById('email').value
            if (!emailPattern.test(email) || email.trim() === '') {
                alert('Please enter a valid email address');
                document.getElementById('email').value = ''
                return;
            } else {
                this.sendVerificationEmail(email)
                this.resetPasswordForm.setVisible(false)
            }
        })
        
        });

    }
        
    sendVerificationEmail(email) {
        socket.emit('sendVerificationEmail', email)

        const verificationForm = this.add.dom(this.centerX, this.centerY).createFromHTML(`
            <form id="verification">
                <div>
                    <input type="text" id="verificationCode" placeholder="Verification Code" required><br>
                </div>
                <div>
                    <input type="password" id="newPassword" placeholder="New Password" required><br>
                </div>
                <div>
                    <input type="password" id="repeatNewPassword" placeholder="Repeat New Password" required><br>
                </div>
                <div>
                    <input type="submit" value="Reset Password">
                </div>
            </form>
            <p style="color:white">Did not get an email? <span class="link-like" id="resendCode">Resend code</span></p>
            <p style="color:white">Wrote a wrong email? <span class="link-like" id="back">Go back</span></p>
        `);

        verificationForm.getChildByID('resendCode').addEventListener('click', (event) => {
            event.preventDefault()
            socket.emit('sendVerificationEmail', email)
        })

        verificationForm.getChildByID('back').addEventListener('click', (event) => {
            event.preventDefault()
            this.removeInputs();
            verificationForm.setVisible(false)
            this.resetPasswordForm.setVisible(true)
        })

        const verify = verificationForm.getChildByID('verification')
        verify.addEventListener('submit', (event) => {
            event.preventDefault()
            const code = document.getElementById('verificationCode').value
            const newPassword = document.getElementById('newPassword').value;
            const repeatNewPassword = document.getElementById('repeatNewPassword').value;
            if (code.trim() === '') {
                alert('Please enter code')
                document.getElementById('verificationCode').value = ''
                document.getElementById('newPassword').value = ''
                document.getElementById('repeatNewPassword').value = ''
            } 
            if (newPassword !== repeatNewPassword) {
                alert('Passwords do not match');
                document.getElementById('verificationCode').value = ''
                document.getElementById('newPassword').value = ''
                document.getElementById('repeatNewPassword').value = ''
                return;
            }
            const data = { email, code, newPassword }
            socket.emit('resetPassword', (data))
            socket.on('resetResponse', (response) => {
                console.log('responsas', response)
                if (response.success) {
                    alert('Password changed successfully')
                    this.scene.restart('login')
                } else {
                    alert('Password reset failed: ' + response.error)
                    document.getElementById('verificationCode').value = ''
                    document.getElementById('newPassword').value = ''
                    document.getElementById('repeatNewPassword').value = ''
                }
            })
        })

    }
    
    update() {

    }

    removeInputs() {
        document.getElementById('uname').value = '';
        document.getElementById('pswd').value = '';
    }

    loadRegister() {
        this.scene.start('register')
        this.scene.stop()
    }

    sendData(username, password) {
        const data = {username, password}
        socket.emit('login', data)
        socket.once('loginResponse', (response) => {
            if (response.success) {
                if (response.firstLogin) {
                    alert('Login successful');
                    this.scene.start('tutorial', {username})
                    this.scene.stop()
                } else {
                    alert('Login successful');
                    this.scene.start('mainMenu', {username});
                    this.scene.stop()
                }
            } else {
                alert('Login failed: ' + response.error);
            }
        });
    }

}

export default Login
