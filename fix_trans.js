const fs = require('fs');

// Fix AppointmentBooking.tsx
let content = fs.readFileSync('src/pages/AppointmentBooking.tsx', 'utf8');

// Find and replace Sinhala section ending
let newContent = content.replace(
  /(\s+verifiedAccount: "ගිණුම තහවුරු කර ඇත",\s+minBookingTime: "[^"]*")(\s*\},\s*ta: \{)/,
  '$1,\n      continueWithYourNumber: "ඔබ වෙනත් ජංගම අංකයකින් වැඩ සම්පූර්ණ කළ හැක.",\n      notificationSent: "දැනුම්දීම යවා ඇත"$2'
);

if (newContent !== content) {
  fs.writeFileSync('src/pages/AppointmentBooking.tsx', newContent, 'utf8');
  console.log('✓ Fixed AppointmentBooking.tsx Sinhala');
} else {
  console.log('✗ AppointmentBooking.tsx Sinhala - no changes');
}

// Fix KioskDashboard.tsx
let kiosk = fs.readFileSync('src/pages/KioskDashboard.tsx', 'utf8');

// Add notificationSent to Sinhala section in KioskDashboard
let newKiosk = kiosk.replace(
  /(\s+continueWithYourNumber: "ඔබ සේවා ඉවරයි කිරීමට ඕනෑම ජංගම අංකයක් සමඟ ඉදිරියට යා හැක\\.")(\s*\},\s*ta: \{)/,
  '$1,\n      notificationSent: "දැනුම්දීම යවා ඇත"$2'
);

if (newKiosk !== kiosk) {
  fs.writeFileSync('src/pages/KioskDashboard.tsx', newKiosk, 'utf8');
  console.log('✓ Fixed KioskDashboard.tsx Sinhala');
} else {
  console.log('✗ KioskDashboard.tsx Sinhala - no changes');
}

// Add notificationSent to Tamil section  
kiosk = fs.readFileSync('src/pages/KioskDashboard.tsx', 'utf8');
newKiosk = kiosk.replace(
  /(\s+continueWithYourNumber: "சேவையை முடிக்க நீங்கள் எந்த மொபைல் எண்ணைக் கொண்டு தொடரலாம்\\.")(\s*\}\s*\}\s*const t = )/ ,
  '$1,\n      notificationSent: "அறிவிப்பு அனுப்பப்பட்டது"$2'
);

if (newKiosk !== kiosk) {
  fs.writeFileSync('src/pages/KioskDashboard.tsx', newKiosk, 'utf8');
  console.log('✓ Fixed KioskDashboard.tsx Tamil');
} else {
  console.log('✗ KioskDashboard.tsx Tamil - no changes');
}
