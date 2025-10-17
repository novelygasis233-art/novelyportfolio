/* --- JAVASCRIPT LOGIC --- */

// 1. Real-Time Date and Time Function
function updateDateTime() {
  const now = new Date();
  
  // Format Date (e.g., October 17, 2025)
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = now.toLocaleDateString('en-US', dateOptions);
  
  // Format Time (e.g., 02:14:31 PM)
  const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
  const formattedTime = now.toLocaleTimeString('en-US', timeOptions);
  
  const dateTimeString = `${formattedDate} | ${formattedTime}`;
  
  document.getElementById('date-time-display').textContent = dateTimeString;
}

// 2. Dynamic Age Calculation Function
function calculateAge(birthdayDay, birthdayMonth, birthYear) {
  const today = new Date();
  // JS months are 0-indexed (Jan=0, Aug=7). We subtract 1 from the given month (8).
  const birthDate = new Date(birthYear, birthdayMonth - 1, birthdayDay);
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - (birthdayMonth - 1);
  
  // Adjust age if the birthday (August 29) hasn't passed yet this year
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Execution when the window loads
window.onload = function() {
  // A. Initialize Real-Time Clock
  updateDateTime();
  setInterval(updateDateTime, 1000); // Update every second
  
  // B. Set Footer Year
  document.getElementById('year-footer').textContent = new Date().getFullYear();
  
  // C. Calculate and Display Dynamic Age
  // Birthday: August (8) 29, 1994 (calculated from age 31 in 2025)
  const BIRTH_DAY = 29;
  const BIRTH_MONTH = 8;
  const BIRTH_YEAR = 1994;
  
  const currentAge = calculateAge(BIRTH_DAY, BIRTH_MONTH, BIRTH_YEAR);
  document.getElementById('age-display').textContent = currentAge;
};