
// We focus on "Friend POV" - candid, natural, slightly imperfect, fan-cam style.
// The goal is to make it look like a real album from a day out.

export const CANDID_MOMENTS = [
  {
    id: 'friend_candid_laugh',
    prompt: 'Candid snapshot taken by a friend across the table or nearby. The subject is laughing naturally, eyes slightly squinted from smiling, hand maybe covering mouth or touching face. Not posing, just a genuine moment. Background shows a slightly different angle of the same location.',
  },
  {
    id: 'walking_past',
    prompt: 'Motion shot. The subject is walking past the camera or walking away, looking back over their shoulder casually. Shot from eye level. Slight motion blur on the limbs. Looks like a paparazzi or fan photo. Distinct background elements visible.',
  },
  {
    id: 'checking_phone_relaxed',
    prompt: 'Subject is distracted, looking down at something (phone, menu, or object), distinct candid vibe. Body language is completely relaxed and unposed. Shot from a slightly higher angle (friend standing up).',
  },
  {
    id: 'caught_off_guard',
    prompt: 'Mid-motion or mid-speech. The subject is looking slightly away from the lens, mouth slightly open as if talking. Authentic, unguarded expression. "Stolen shot" aesthetic. Background depth is natural, not excessively blurry.',
  },
  {
    id: 'close_up_selfie_style',
    prompt: 'Shot appears to be a selfie or taken very close with a wide lens (0.5x phone camera style). Distortion on the nose/features is minimal but perspective is intimate. Fun, goofy, or cute expression. Background is visible but wide-angle.',
  },
  {
    id: 'wide_environmental_context',
    prompt: 'Wide shot from a distance (20-30 feet away). Shows the subject small in the frame, interacting with the environment (sitting on a ledge, leaning on a wall). Emphasizes the location atmosphere. "Tourist photo" vibe.',
  },
  {
    id: 'low_angle_sneaker_check',
    prompt: 'Low angle shot, looking up at the subject. Fashion-forward but casual "outfit check" vibe. Emphasizes the shoes and pants, subject looking down at the camera or looking away confidently.',
  },
  {
    id: 'flash_photography_night',
    prompt: 'Direct flash photography (if environment allows, or simulated daylight flash). Harsh shadows behind the subject, high contrast, retro digital camera aesthetic (2000s vibe). Very trendy and raw.',
  },
  {
    id: 'messy_hair_windy',
    prompt: 'Wind blowing hair across face, subject trying to fix it. Dynamic, chaotic, but aesthetic. Natural lighting hitting the face unevenly. Very realistic texture.',
  },
  {
    id: 'resting_bored',
    prompt: 'Subject resting chin on hand, looking bored or tired but cute. Very relatable "waiting for food" or "tired after walking" vibe. Slouching posture. Authentic vibe.',
  }
];

// Helper to get N random unique poses
export const getRandomPoses = (count: number) => {
  const shuffled = [...CANDID_MOMENTS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};
