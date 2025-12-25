const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY || 're_evJvkb2A_2kCyCrxmNHs9ALjxb8bL466r');
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'wbesthornejr@gmail.com';

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// In-memory session storage (Reset on server restart)
const sessions = {};

const STAGES = {
    GREETING: 'GREETING',
    NEEDS: 'NEEDS',
    DEEP_DIVE: 'DEEP_DIVE',
    CONTACT_INFO: 'CONTACT_INFO',
    CONFIRM_EMAIL: 'CONFIRM_EMAIL',
    CLOSING: 'CLOSING'
};

const getInitialSession = () => ({
    stage: STAGES.GREETING,
    data: {
        name: null,
        email: null,
        phone: null,
        company: null,
        interest: null,
        details: [],
        transcript: []
    }
});

const getSmartResponse = async (sessionId, message) => {
    let session = sessions[sessionId];
    if (!session) {
        session = getInitialSession();
        sessions[sessionId] = session;
    }

    const msg = message.toLowerCase();
    session.data.transcript.push({ sender: 'user', text: message });

    // Global check for escalation or misunderstanding
    if (msg.includes('human') || msg.includes('person') || msg.includes('speak to') || msg.includes('frustrated')) {
        return {
            text: "I understand you have a more nuanced query, or perhaps prefer to speak with a human directly. I've noted your request, and I'll ensure your message is prioritized for a direct follow-up from one of our specialists right away. Thank you for your patience.",
            isEscalation: true
        };
    }

    // Logic based on STAGES
    switch (session.stage) {
        case STAGES.GREETING:
            session.stage = STAGES.NEEDS;
            return {
                text: "Hello! Welcome to Polymath Code. I'm your dedicated AI assistant, here to streamline your journey with us. How can I assist you with your innovative website, sophisticated app, or custom software solution today?\n\nTo best understand how Polymath Code can empower your vision, could you share the primary focus of your project? Are you exploring:\n- New Website Development\n- Custom Web Application\n- Mobile App Development\n- Software Solution Integration\n- Digital Strategy & Consulting\n- Something else specific?"
            };

        case STAGES.NEEDS:
            session.data.interest = message;
            session.stage = STAGES.DEEP_DIVE;

            if (msg.includes('website')) {
                return {
                    text: "Excellent. For your website, what are your primary objectives? Are you aiming to:\n- Establish a strong online presence?\n- Generate leads or inquiries?\n- Showcase a portfolio or services?\n- Implement e-commerce capabilities?\n- Or something unique to your business?\n\nAny details about your industry or target audience would also be helpful."
                };
            } else if (msg.includes('app') || msg.includes('custom') || msg.includes('software')) {
                return {
                    text: "Fascinating. For your custom application, what core problem are you looking to solve, or what innovative functionality do you envision? Could you briefly describe the main purpose or key features you're considering?"
                };
            } else if (msg.includes('strategy') || msg.includes('consulting')) {
                return {
                    text: "Understood. With digital strategy, we often begin by identifying critical business challenges or growth opportunities. What strategic areas are you most keen to explore with Polymath Code?"
                };
            } else {
                return {
                    text: "Thank you for letting me know. Could you elaborate a bit more on your specific needs or the nature of the project you have in mind? The more details you can provide, the better I can assist."
                };
            }

        case STAGES.DEEP_DIVE:
            session.data.details.push(message);
            session.stage = STAGES.CONTACT_INFO;
            return {
                text: "Thank you for these valuable details. To ensure a specialist from Polymath Code can connect with you regarding your project, may I please have your full name and preferred email address?"
            };

        case STAGES.CONTACT_INFO:
            // Very basic extraction for name and email
            const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
            const emailMatch = message.match(emailRegex);

            if (emailMatch) {
                session.data.email = emailMatch[0];
                // Assume the rest is name if it's there
                const namePart = message.replace(emailMatch[0], '').trim();
                if (namePart) session.data.name = namePart;

                session.stage = STAGES.CONFIRM_EMAIL;
                return {
                    text: `Just to confirm, your email is **${session.data.email}**. Is that correct?`
                };
            } else {
                return {
                    text: "My apologies, I seem to have missed your email address. Could you please provide your email so we can reach out?"
                };
            }

        case STAGES.CONFIRM_EMAIL:
            if (msg.includes('yes') || msg.includes('correct') || msg.includes('yeah') || msg.includes('right')) {
                session.stage = STAGES.CLOSING;
                await sendLeadEmail(session);
                return {
                    text: "Excellent! Your insights are now with our team at Polymath Code. We will carefully review your requirements, and a dedicated specialist will be in touch with you directly within 2-4 business hours.\n\nWe appreciate you choosing Polymath Code to bring your digital vision to life. Is there anything else I can quickly assist you with before I forward your details?"
                };
            } else {
                session.stage = STAGES.CONTACT_INFO;
                return {
                    text: "I'm sorry about that! Let's try again. What is your correct email address?"
                };
            }

        case STAGES.CLOSING:
            return {
                text: "Thank you! Have a wonderful day!"
            };

        default:
            return {
                text: "My apologies, I seem to have misunderstood. Could you please rephrase that, or provide a little more detail? I want to ensure I capture your needs accurately."
            };
    }
};

const sendLeadEmail = async (session) => {
    const { name, email, interest, details, transcript } = session.data;

    let subjectLine = `NEW LEAD: ${interest || 'Inquiry'} - ${name || email}`;
    if (interest && interest.toLowerCase().includes('urgent')) subjectLine += ' (Urgent)';

    try {
        await resend.emails.send({
            from: 'Polymath Assistant <onboarding@resend.dev>',
            to: [CONTACT_EMAIL],
            subject: subjectLine,
            html: `
                <h2>New Client Inquiry for Polymath Code</h2>
                <p><strong>Client Name:</strong> ${name || 'Not provided'}</p>
                <p><strong>Email Address:</strong> ${email}</p>
                <p><strong>Primary Interest:</strong> ${interest || 'General'}</p>
                <p><strong>Client Objectives/Needs:</strong></p>
                <ul>
                    ${details.map(d => `<li>${d}</li>`).join('')}
                </ul>
                <hr />
                <p><strong>AI Conversation Transcript:</strong></p>
                <pre>${transcript.map(t => `${t.sender.toUpperCase()}: ${t.text}`).join('\n')}</pre>
                <p>Sent via PolyMath AI Contact</p>
            `,
        });
        console.log(`Lead email sent for ${email}`);
    } catch (err) {
        console.error('Failed to send lead email:', err);
    }
}

// Endpoints
app.post('/api/chat', async (req, res) => {
    const { message, sessionId } = req.body;
    const sId = sessionId || uuidv4();

    console.log(`[PolyMath AI Contact] Session ${sId} : ${message}`);

    const response = await getSmartResponse(sId, message);
    sessions[sId].data.transcript.push({ sender: 'ai', text: response.text });

    console.log(`[PolyMath AI Contact] Response for ${sId}: ${response.text.substring(0, 50)}...`);

    res.json({
        response: response.text,
        sessionId: sId,
        isEscalation: response.isEscalation || false
    });
});

app.get('/health', (req, res) => res.status(200).send('Server is awake'));

app.listen(PORT, () => {
    console.log(`PolyMath AI Contact Server running on http://localhost:${PORT}`);
});
