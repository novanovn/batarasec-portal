const nodemailer = require("nodemailer");
const t = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 587,
  secure: false,
  auth: {
    user: "novan.hariman@batarasec.com",
    pass: "Bac2bas6@!",
  },
  connectionTimeout: 10000,
});

t.sendMail({
  from: "BataraSec <noreply@batarasec.com>",
  to: "novanovn@gmail.com",
  subject: "[TEST] BataraSec Portal SMTP Test",
  text: "Test email dari BataraSec Portal VPS.\n\nJika Anda menerima email ini, SMTP live send berfungsi.",
  html: "<p>Test email dari BataraSec Portal VPS.</p><p>Jika Anda menerima email ini, SMTP live send berfungsi.</p>",
})
  .then((info) => {
    console.log("SEND OK:", info.response, "MessageId:", info.messageId);
    process.exit(0);
  })
  .catch((e) => {
    console.error("SEND FAIL:", e.message);
    process.exit(1);
  });
