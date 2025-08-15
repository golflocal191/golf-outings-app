const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const nodemailer = require('nodemailer');
const path = require('path');
const { Low, JSONFile } = require('lowdb');
const lodashId = require('lodash-id');
const { nanoid } = require('nanoid');

// Load environment variables from .env if present
require('dotenv').config();

// Configure lowdb to use a JSON file for persistence
const dbFile = path.join(__dirname, 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

async function initDb() {
  await db.read();
  db.data ||= { events: [], signups: [] };
  // Decorate DB with lodash-id helpers if needed
  db.chain = require('lodash').chain(db.data);
  await db.write();
}

// Initialize application
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from public directory
app.use('/static', express.static(path.join(__dirname, 'public')));

// Parse form submissions
app.use(bodyParser.urlencoded({ extended: true }));

// Configure session for simple admin authentication
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'golf_outings_secret',
    resave: false,
    saveUninitialized: false,
  })
);

// Helper to format date/time for display
function formatDate(date) {
  return new Date(date).toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

// Home page: list upcoming events
app.get('/', async (req, res) => {
  await db.read();
  const events = db.data.events;
  res.render('index', { events, formatDate });
});

// Show sign‑up form for a specific event
app.get('/signup/:eventId', async (req, res) => {
  await db.read();
  const event = db.data.events.find((e) => e.id === req.params.eventId);
  if (!event) {
    return res.status(404).send('Event not found');
  }
  res.render('signup', { event });
});

// Handle sign‑up submissions
app.post('/signup/:eventId', async (req, res) => {
  await db.read();
  const event = db.data.events.find((e) => e.id === req.params.eventId);
  if (!event) {
    return res.status(404).send('Event not found');
  }
  const { name, email, phone, handicap, notes } = req.body;
  // Basic validation
  if (!name || !email) {
    return res.status(400).send('Name and Email are required.');
  }
  const signup = {
    id: nanoid(),
    eventId: event.id,
    name,
    email,
    phone,
    handicap,
    notes,
    timestamp: new Date().toISOString(),
  };
  db.data.signups.push(signup);
  await db.write();
  // Send confirmation email to participant if configured
  sendConfirmationEmail(signup, event).catch((err) => {
    console.error('Error sending confirmation email:', err);
  });
  res.render('signup_success', { event, signup });
});

// Admin login page
app.get('/admin/login', (req, res) => {
  res.render('admin_login', { error: null });
});

// Handle admin login
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'admin';
  if (username === adminUser && password === adminPass) {
    req.session.admin = true;
    res.redirect('/admin');
  } else {
    res.render('admin_login', { error: 'Invalid credentials' });
  }
});

// Require admin authentication middleware
function requireAdmin(req, res, next) {
  if (req.session.admin) {
    return next();
  }
  res.redirect('/admin/login');
}

// Admin dashboard
app.get('/admin', requireAdmin, async (req, res) => {
  await db.read();
  const events = db.data.events;
  const signups = db.data.signups;
  // Group signups by event id
  const grouped = {};
  events.forEach((event) => {
    grouped[event.id] = {
      event,
      signups: signups.filter((s) => s.eventId === event.id),
    };
  });
  res.render('admin_dashboard', { grouped, formatDate, message: null });
});

// Admin create event page
app.get('/admin/events/new', requireAdmin, (req, res) => {
  res.render('admin_event_form', { event: null, error: null });
});

// Handle event creation
app.post('/admin/events/new', requireAdmin, async (req, res) => {
  await db.read();
  const { title, date, location, description } = req.body;
  if (!title || !date || !location) {
    return res.render('admin_event_form', { event: null, error: 'Title, date and location are required.' });
  }
  const event = {
    id: nanoid(),
    title,
    date,
    location,
    description,
  };
  db.data.events.push(event);
  await db.write();
  res.redirect('/admin');
});

// Admin notify participants page (send email to all signups for event)
app.post('/admin/notify/:eventId', requireAdmin, async (req, res) => {
  await db.read();
  const eventId = req.params.eventId;
  const event = db.data.events.find((e) => e.id === eventId);
  if (!event) {
    return res.status(404).send('Event not found');
  }
  const signups = db.data.signups.filter((s) => s.eventId === eventId);
  const sent = await sendBulkNotification(event, signups);
  // After sending, redirect with message
  await db.read();
  const events = db.data.events;
  const allSignups = db.data.signups;
  const grouped = {};
  events.forEach((ev) => {
    grouped[ev.id] = {
      event: ev,
      signups: allSignups.filter((s) => s.eventId === ev.id),
    };
  });
  res.render('admin_dashboard', { grouped, formatDate, message: `Sent ${sent} emails.` });
});

// Log out admin
app.post('/admin/logout', requireAdmin, (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Helper to create transporter for sending emails
function createTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) {
    console.warn('EMAIL_USER or EMAIL_PASS not set. Emails will not be sent.');
    return null;
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });
}

// Send confirmation email to participant
async function sendConfirmationEmail(signup, event) {
  const transporter = createTransporter();
  if (!transporter) return;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: signup.email,
    subject: `Confirmation: ${event.title}`,
    text: `Hello ${signup.name},\n\nThank you for signing up for the ${event.title} on ${formatDate(event.date)} at ${event.location}.\n\nWe look forward to seeing you!\n\n— Golf Outings Team`,
  };
  await transporter.sendMail(mailOptions);
}

// Send bulk notification to signups of an event
async function sendBulkNotification(event, signups) {
  const transporter = createTransporter();
  if (!transporter) return 0;
  let count = 0;
  for (const signup of signups) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: signup.email,
      subject: `Reminder: ${event.title}`,
      text: `Hello ${signup.name},\n\nThis is a reminder for the upcoming ${event.title} on ${formatDate(event.date)} at ${event.location}.\n\nWe hope to see you there!\n\n— Golf Outings Team`,
    };
    try {
      await transporter.sendMail(mailOptions);
      count++;
    } catch (err) {
      console.error('Failed to send mail to', signup.email, err);
    }
  }
  return count;
}

// Start server
async function start() {
  await initDb();
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
}

start();