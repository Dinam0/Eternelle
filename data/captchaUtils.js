  const { createCanvas, registerFont } = require('canvas');

  // Register the font to be used for captcha text
  registerFont('captcha/fa-solid-900.ttf', { family: 'CaptchaFont' });

  // Function to generate captcha
  const createCaptcha = () => {
    const canvas = createCanvas(200, 80);
    const ctx = canvas.getContext('2d');

    // Set the background color
    ctx.fillStyle = '#000000'; // Black background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Generate random captcha text
    const captchaText = Math.random().toString(36).slice(2, 8).toUpperCase();

    // Set the font properties
    const fontSize = 36;
    ctx.font = `${fontSize}px CaptchaFont`;
    ctx.fillStyle = '#FFD700'; // Gold color
    ctx.strokeStyle = '#808080'; // Gray color for border
    ctx.lineWidth = 2;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    // Calculate the position to center the text
    const textX = canvas.width / 2;
    const textY = canvas.height / 2;

    // Draw the border around the text
    ctx.strokeText(captchaText, textX, textY);

    // Draw captcha text on canvas
    ctx.fillText(captchaText, textX, textY);

    // Generate captcha image buffer
    const imageBuffer = canvas.toBuffer('image/png');

    return { captchaText, imageBuffer };
  };

  module.exports = {
    createCaptcha,
  };
