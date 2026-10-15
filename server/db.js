const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'roomiefind.db');
const db = new DatabaseSync(dbPath);

// Enable foreign keys and WAL mode for better concurrency
db.exec('PRAGMA foreign_keys = ON;');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      deposit INTEGER DEFAULT 0,
      utilities_est TEXT DEFAULT '~$60/mo',
      location TEXT NOT NULL,
      address TEXT NOT NULL,
      neighborhood TEXT,
      room_type TEXT NOT NULL,
      bathrooms TEXT NOT NULL,
      bedrooms INTEGER DEFAULT 1,
      furnished INTEGER DEFAULT 1,
      pet_friendly INTEGER DEFAULT 0,
      private_bath INTEGER DEFAULT 0,
      utilities_included INTEGER DEFAULT 0,
      verified_landlord INTEGER DEFAULT 1,
      move_in_date TEXT,
      vibe TEXT DEFAULT 'Social & Friendly',
      cleanliness TEXT DEFAULT '5/5 (Immaculate)',
      schedule TEXT DEFAULT 'Early Bird',
      lifestyle TEXT DEFAULT 'Quiet & Professional',
      match_score INTEGER DEFAULT 94,
      min_lease TEXT DEFAULT '6 months',
      rules TEXT,
      amenities TEXT,
      images TEXT,
      host_name TEXT NOT NULL,
      host_avatar TEXT,
      host_details TEXT DEFAULT 'Verified ID & Background',
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS saved_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      listing_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, listing_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      listing_id INTEGER NOT NULL,
      tour_date TEXT NOT NULL,
      tour_time TEXT NOT NULL,
      guests TEXT NOT NULL,
      phone TEXT NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'Confirmed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      sender_type TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      sender_avatar TEXT,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  seedData();
}

function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  let demoUserId = 1;
  let sarahId = 2;

  if (userCount === 0) {
    const hashedPassword = bcrypt.hashSync('password123', 10);
    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password, avatar)
      VALUES (?, ?, ?, ?)
    `);

    const r1 = insertUser.run('John Doe', 'john.doe@email.com', hashedPassword, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80');
    demoUserId = Number(r1.lastInsertRowid);

    const r2 = insertUser.run('Sarah Jenkins', 'sarah@roomiefind.com', hashedPassword, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80');
    sarahId = Number(r2.lastInsertRowid);

    insertUser.run('Alex Rivera', 'alex@roomiefind.com', hashedPassword, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80');
    insertUser.run('Elena Rostova', 'elena@roomiefind.com', hashedPassword, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80');
  }

  const listingCount = db.prepare('SELECT COUNT(*) as count FROM listings').get().count;
  if (listingCount === 0) {
    const insertListing = db.prepare(`
      INSERT INTO listings (
        title, description, price, deposit, utilities_est, location, address, neighborhood,
        room_type, bathrooms, bedrooms, furnished, pet_friendly, private_bath,
        utilities_included, verified_landlord, move_in_date, vibe, cleanliness,
        schedule, lifestyle, match_score, min_lease, rules, amenities, images,
        host_name, host_avatar, host_details, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Listing 1: Sunnyside
    insertListing.run(
      'Cozy Private Room in Sunnyside Apartment',
      'Beautiful sunny bedroom with huge bay windows in a calm, tree-lined Sunnyside street. High ceilings, hardwood floors, and access to a shared rooftop with skyline views. Just 10 minutes walk to the 7 subway train with quick 15-min ride to Midtown Manhattan.',
      850,
      850,
      '~$60/mo',
      'Queens, NY',
      '452 Sunnyside Ave, Queens, NY',
      'Sunnyside',
      'Private Room',
      'Private Bath',
      1,
      1, // furnished
      1, // pet_friendly
      1, // private_bath
      0, // utilities_included
      1, // verified_landlord
      '2026-09-01',
      'Quiet & Studious',
      '5/5 (Immaculate)',
      'Early Bird',
      'Quiet & Professional',
      94,
      '6 months',
      JSON.stringify(['No Smoking Indoors', 'Small Pets Allowed', 'Quiet Hours after 10 PM', 'Guest Policy: Max 2 visitors']),
      JSON.stringify(['High-Speed Wi-Fi', 'Central AC', 'In-Unit Laundry', 'Free Parking', 'Building Gym', 'Fully Equipped Kitchen']),
      JSON.stringify([
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=400&q=80'
      ]),
      'Sarah Jenkins',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      'Member since March 2022 • Verified ID & Background',
      sarahId
    );

    // Listing 2: Downtown
    insertListing.run(
      'Modern Master Suite with Skyline View',
      'Huge high-rise master bedroom in luxury doorman building located in the heart of Downtown. Features floor-to-ceiling windows, modern kitchen with stainless steel appliances, 24/7 concierge, gym, and heated rooftop pool.',
      1100,
      1100,
      'Included',
      'Downtown, NY',
      '120 Wall Street, New York, NY',
      'Financial District',
      'Private Room',
      'Shared Bath',
      1,
      0, // unfurnished
      0, // pet_friendly
      0, // private_bath
      1, // utilities_included
      1, // verified_landlord
      '2026-08-15',
      'Social & Friendly',
      '4.8/5 (Very Clean)',
      'Flexible',
      'Social & Active',
      89,
      '12 months',
      JSON.stringify(['No Smoking Indoors', 'No Pets', 'Quiet Hours after 11 PM', 'Overnight guests allowed with advance notice']),
      JSON.stringify(['High-Speed Wi-Fi', 'Central AC', 'In-Unit Laundry', 'Building Gym', 'Doorman 24/7', 'Rooftop Pool']),
      JSON.stringify([
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=400&q=80'
      ]),
      'Alex Rivera',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      'Member since January 2023 • Verified Host',
      demoUserId
    );

    // Listing 3: Williamsburg
    insertListing.run(
      'Bright Bohemian Loft in Williamsburg',
      'Spacious room in a converted industrial artist loft in prime Williamsburg. Exposed brick, soaring 14-foot ceilings, original timber beams, and south-facing windows flooded with natural sunlight. Surrounded by top cafes and music venues.',
      950,
      950,
      '~$45/mo',
      'Brooklyn, NY',
      '210 Bedford Ave, Brooklyn, NY',
      'Williamsburg',
      'Private Room',
      'Private Bath',
      1,
      1, // furnished
      1, // pet_friendly
      1, // private_bath
      0, // utilities_included
      1, // verified_landlord
      '2026-09-15',
      'LGBTQ+ Friendly',
      '4.9/5 (Spotless)',
      'Night Owl Friendly',
      'Creative & Warm',
      96,
      '3 months minimum',
      JSON.stringify(['No Smoking Indoors', 'All Pets Welcome', 'Respectful Volume in Common Areas', 'LGBTQ+ Welcoming Space']),
      JSON.stringify(['High-Speed Wi-Fi', 'Central AC', 'In-Unit Laundry', 'Dishwasher', 'Balcony', 'Plant Friendly']),
      JSON.stringify([
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=400&q=80'
      ]),
      'Elena Rostova',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      'Member since October 2021 • Superhost',
      sarahId
    );

    // Listing 4: Park Slope Entire Place
    insertListing.run(
      'Charming Brownstone Studio with Garden Patio',
      'Private garden studio on the ground floor of an authentic Victorian brownstone in Park Slope. Private entrance, direct access to a tranquil garden patio, decorative marble fireplace, and chef-grade gas range kitchen.',
      1450,
      1450,
      'Included',
      'Brooklyn, NY',
      '84 7th Ave, Brooklyn, NY',
      'Park Slope',
      'Entire Place',
      'Private Bath',
      1,
      1, // furnished
      1, // pet_friendly
      1, // private_bath
      1, // utilities_included
      1, // verified_landlord
      '2026-09-01',
      'Quiet & Studious',
      '5/5 (Immaculate)',
      'Early Bird',
      'Private & Peaceful',
      91,
      '12 months',
      JSON.stringify(['No Smoking Indoors', 'Cats & Well-Behaved Dogs OK', 'Quiet Residential Neighborhood']),
      JSON.stringify(['High-Speed Wi-Fi', 'Private Garden', 'In-Unit Laundry', 'Central Heat/AC', 'Dishwasher', 'Storage Space']),
      JSON.stringify([
        'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=400&q=80'
      ]),
      'Sarah Jenkins',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      'Member since March 2022 • Verified ID & Background',
      sarahId
    );

    // Listing 5: Astoria Flatshare
    insertListing.run(
      'Sunny Private Room near Astoria Park',
      'Bright queen bedroom in a friendly 2-bedroom Astoria apartment. Steps from Astoria Park with outdoor tennis courts and Olympic pool. Flatmate is a 27yo UX designer who loves cooking and weekend farmer markets.',
      780,
      780,
      '~$50/mo',
      'Queens, NY',
      '23-14 Ditmars Blvd, Queens, NY',
      'Astoria',
      'Private Room',
      'Shared Bath',
      1,
      1, // furnished
      0, // pet_friendly
      0, // private_bath
      0, // utilities_included
      1, // verified_landlord
      '2026-08-20',
      'Social & Friendly',
      '4.7/5 (Clean & Organized)',
      'Flexible',
      'Friendly & Balanced',
      93,
      '6 months',
      JSON.stringify(['No Smoking Indoors', 'No Pets', 'Chore rotation for kitchen & bath']),
      JSON.stringify(['High-Speed Wi-Fi', 'Balcony', 'Dishwasher', 'Bike Storage', 'Air Conditioning']),
      JSON.stringify([
        'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80'
      ]),
      'Alex Rivera',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      'Member since January 2023 • Verified Host',
      demoUserId
    );

    // Seed initial message for listing 1
    const insertMessage = db.prepare(`
      INSERT INTO messages (listing_id, user_id, sender_type, sender_name, sender_avatar, message)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertMessage.run(
      1,
      demoUserId,
      'host',
      'Sarah Jenkins',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
      'Hi there! Thanks for your interest in the Sunnyside room 🌿 Happy to answer any questions.'
    );

    insertMessage.run(
      1,
      demoUserId,
      'host',
      'Sarah Jenkins',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
      "Let me know if you'd like to schedule a tour or need details about the lease."
    );
  }
}

// Initialize tables and seed on require
initDatabase();

module.exports = db;
