const sendEmail = async ({ to, subject, html }) => {
  // =========================
  // BREVO EMAIL SERVICE
  // =========================
  if (process.env.BREVO_API_KEY) {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: "SkillKwiz",
            email:
              process.env.EMAIL_FROM ||
              "safuramariyam123@gmail.com",
          },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });

      if (res.ok) {
        console.log(`[Email] Brevo sent to ${to}`);
        return { success: true };
      }

      const err = await res.json();
      console.error("[Email] Brevo error:", err.message);
    } catch (err) {
      console.error("[Email] Brevo fetch error:", err.message);
    }
  }

  // =========================
  // RESEND EMAIL SERVICE
  // =========================
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from:
            process.env.EMAIL_FROM ||
            "onboarding@resend.dev",
          to,
          subject,
          html,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("[Email] Resend error:", data.message);

        return {
          success: false,
          error: data.message,
        };
      }

      console.log(
        `[Email] Resend sent to ${to}: ${data.id}`
      );

      return { success: true };
    } catch (err) {
      console.error("[Email] Resend fetch error:", err.message);

      return {
        success: false,
        error: err.message,
      };
    }
  }

  // =========================
  // DEVELOPMENT FALLBACK
  // =========================
  console.log(`[Email DEV] To: ${to} | Subject: ${subject}`);

  return { success: true };
};

// =====================================
// OTP EMAIL
// =====================================
const sendOtpEmail = (to, otp) =>
  sendEmail({
    to,
    subject: "Your SkillKwiz OTP Code",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px;">
        <h2 style="color:#00418d;text-align:center;">SkillKwiz</h2>

        <h3>Your Verification Code</h3>

        <p>
          Use this OTP to verify your email.
          Valid for <strong>10 minutes</strong>.
        </p>

        <div style="background:#f0f4ff;border:2px dashed #00418d;border-radius:8px;padding:20px;text-align:center;margin:20px 0;">
          <span style="font-size:36px;font-weight:bold;color:#00418d;letter-spacing:8px;">
            ${otp}
          </span>
        </div>

        <p style="color:#888;font-size:12px;">
          If you did not request this, please ignore this email.
        </p>
      </div>
    `,
  });

// =====================================
// WELCOME EMAIL
// =====================================
const sendWelcomeEmail = (to, name, role) =>
  sendEmail({
    to,
    subject: "Welcome to SkillKwiz!",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
        <h2 style="color:#00418d;">
          Welcome to SkillKwiz, ${name}!
        </h2>

        <p>
          Your <strong>${role}</strong> account has been created.
        </p>

        <a
          href="${process.env.CLIENT_URL || "https://skillkwiz-frontend.vercel.app"}/services"
          style="display:inline-block;padding:12px 24px;background:#f73e5d;color:white;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:16px;"
        >
          Get Started
        </a>
      </div>
    `,
  });

// =====================================
// ASSESSMENT CONFIRMATION EMAIL
// =====================================
const sendAssessmentConfirmation = (
  to,
  name,
  details
) =>
  sendEmail({
    to,
    subject: "Assessment Scheduled - SkillKwiz",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
        <h2 style="color:#00418d;">
          Assessment Confirmed!
        </h2>

        <p>
          Hi ${name}, your assessment has been scheduled.
        </p>

        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <tr>
            <td style="padding:8px;border:1px solid #eee;color:#888;">
              Company
            </td>
            <td style="padding:8px;border:1px solid #eee;font-weight:bold;">
              ${details.company}
            </td>
          </tr>

          <tr>
            <td style="padding:8px;border:1px solid #eee;color:#888;">
              Date
            </td>
            <td style="padding:8px;border:1px solid #eee;">
              ${details.date}
            </td>
          </tr>

          <tr>
            <td style="padding:8px;border:1px solid #eee;color:#888;">
              Time
            </td>
            <td style="padding:8px;border:1px solid #eee;">
              ${details.time}
            </td>
          </tr>

          <tr>
            <td style="padding:8px;border:1px solid #eee;color:#888;">
              Centre
            </td>
            <td style="padding:8px;border:1px solid #eee;">
              ${details.centre}
            </td>
          </tr>
        </table>
      </div>
    `,
  });

// =====================================
// ASSESSMENT REQUEST EMAIL
// =====================================
const sendAssessmentRequestNotification = (
  to,
  candidateName,
  employerCompany,
  skills
) =>
  sendEmail({
    to,
    subject: `Assessment Invitation from ${employerCompany} - SkillKwiz`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
        <h2 style="color:#00418d;">
          You've Been Invited for an Assessment!
        </h2>

        <p>Hi ${candidateName},</p>

        <p>
          <strong>${employerCompany}</strong>
          has requested a skill assessment for:
          <strong>${(skills || []).join(", ")}</strong>
        </p>

        <a
          href="${process.env.CLIENT_URL || "https://skillkwiz-frontend.vercel.app"}/services"
          style="display:inline-block;padding:12px 24px;background:#f73e5d;color:white;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:16px;"
        >
          View Invitation
        </a>
      </div>
    `,
  });

// =====================================
// LOGIN CREDENTIALS EMAIL
// =====================================
const sendCredentialsEmail = (
  to,
  candidateName,
  companyName,
  companyCode,
  username,
  password
) =>
  sendEmail({
    to,
    subject: `${companyName} Assessment Login Credentials - SkillKwiz`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px;">
        <h2 style="color:#00418d;text-align:center;">
          SkillKwiz
        </h2>

        <h3>
          You've been invited to take an assessment!
        </h3>

        <p>
          Hi <strong>${candidateName}</strong>,
        </p>

        <p>
          <strong>${companyName}</strong>
          has invited you to take a skill assessment.
        </p>

        <div style="background:#f0f4ff;border-radius:8px;padding:20px;margin:20px 0;">
          <table style="width:100%;">
            <tr>
              <td style="padding:8px;color:#888;width:40%;">
                Login URL
              </td>

              <td style="padding:8px;">
                <a href="${process.env.CLIENT_URL || "https://skillkwiz-frontend.vercel.app"}/services">
                  ${process.env.CLIENT_URL || "https://skillkwiz-frontend.vercel.app"}/services
                </a>
              </td>
            </tr>

            <tr>
              <td style="padding:8px;color:#888;">
                Company Code
              </td>

              <td style="padding:8px;font-size:20px;font-weight:bold;color:#00418d;letter-spacing:4px;">
                ${companyCode}
              </td>
            </tr>

            <tr>
              <td style="padding:8px;color:#888;">
                Username
              </td>

              <td style="padding:8px;font-size:18px;font-weight:bold;">
                ${username}
              </td>
            </tr>

            <tr>
              <td style="padding:8px;color:#888;">
                Password
              </td>

              <td style="padding:8px;font-size:18px;font-weight:bold;">
                ${password}
              </td>
            </tr>
          </table>
        </div>

        <p style="color:#e53e3e;font-size:13px;">
          ⚠️ Keep these credentials confidential.
        </p>

        <p style="color:#888;font-size:12px;">
          Select your assessment slot after logging in.
          No rescheduling allowed after booking.
        </p>
      </div>
    `,
  });

// =====================================
// EXPORTS
// =====================================
module.exports = {
  sendOtpEmail,
  sendWelcomeEmail,
  sendAssessmentConfirmation,
  sendAssessmentRequestNotification,
  sendCredentialsEmail,
};