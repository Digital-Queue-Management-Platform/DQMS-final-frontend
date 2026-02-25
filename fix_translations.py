#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re

# Fix AppointmentBooking.tsx
with open('src/pages/AppointmentBooking.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add missing keys to Sinhala section in AppointmentBooking
sinhala_pattern = r'(      minBookingTime: "[^"]*"\n    ),\n    ta: {'
sinhala_replacement = r'''\1,
      continueWithYourNumber: "ඔබ වෙනත් ජංගම අංකයකින් වැඩ සම්පූර්ණ කළ හැක.",
      notificationSent: "දැනුම්දීම යවා ඇත"
    },
    ta: {'''

content = re.sub(sinhala_pattern, sinhala_replacement, content)

with open('src/pages/AppointmentBooking.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Fixed AppointmentBooking.tsx translations")

# Fix KioskDashboard.tsx
with open('src/pages/KioskDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add notificationSent to Sinhala section
sinhala_pattern2 = r'(      continueWithYourNumber: "[^"]*"\n    ),\n    ta: {'
sinhala_replacement2 = r'''\1,
      notificationSent: "දැනුම්දීම යවා ඇත"
    },
    ta: {'''

content = re.sub(sinhala_pattern2, sinhala_replacement2, content)

# Add notificationSent to Tamil section - fix format
tamil_pattern = r'(      continueWithYourNumber: "[^"]*"\n    )\n  }'
tamil_replacement = r'''\1,
      notificationSent: "அறிவிப்பு அனுப்பப்பட்டது"
    }
  }'''

content = re.sub(tamil_pattern, tamil_replacement, content)

with open('src/pages/KioskDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Fixed KioskDashboard.tsx translations")
