// static/js/logsi.js (Corrected)

const wrapper = document.querySelector(".wrapper");
const loginLink = document.getElementById("loginLink");
const signupLink = document.getElementById("signupLink");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

signupLink.addEventListener("click", (e) => {
  e.preventDefault();
  wrapper.classList.add("active");
});

loginLink.addEventListener("click", (e) => {
  e.preventDefault();
  wrapper.classList.remove("active");
});

function showMessage(formElement, message, isError = false) {
  const messageBox = formElement.querySelector(".form-message");
  if (messageBox) {
    messageBox.textContent = message;
    messageBox.className = `form-message ${isError ? 'error' : 'success'}`;
  }
}

// (Password toggle function remains the same, no changes needed here)
function togglePasswordVisibility(passField, toggleIcon) {
  if (passField.type === "password") {
    passField.type = "text";
    toggleIcon.classList.replace("bxs-hide", "bxs-show");
  } else {
    passField.type = "password";
    toggleIcon.classList.replace("bxs-show", "bxs-hide");
  }
}
document.getElementById("toggleLoginPass").addEventListener("click", () => togglePasswordVisibility(document.getElementById("loginPass"), document.getElementById("toggleLoginPass")));
document.getElementById("toggleRegPass").addEventListener("click", () => togglePasswordVisibility(document.getElementById("regPass"), document.getElementById("toggleRegPass")));
document.getElementById("toggleRegPass2").addEventListener("click", () => togglePasswordVisibility(document.getElementById("regPass2"), document.getElementById("toggleRegPass2")));


loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("loginUser").value.trim();
  const password = document.getElementById("loginPass").value.trim();

  try {
    // --- FIX #1: Correct URL for login ---
    const res = await fetch('/auth/login', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    
    if (res.ok) {
      localStorage.setItem('userId', data.userId);
      showMessage(loginForm, data.message, false);
      setTimeout(() => {
        // --- FIX #2: Redirect to the Flask ROUTE, not the file ---
        window.location.href = '/main'; 
      }, 1000);
    } else {
      showMessage(loginForm, data.message, true);
    }
  } catch (err) {
    console.error("Login error:", err);
    showMessage(loginForm, "A network error occurred. Please try again.", true);
  }
});


registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("regUser").value.trim();
  const password = document.getElementById("regPass").value.trim();
  const confirmPassword = document.getElementById("regPass2").value.trim();

  if (!username || !password || !confirmPassword) {
    showMessage(registerForm, "Please fill in all fields!", true);
    return;
  }
  if (password !== confirmPassword) {
    showMessage(registerForm, "Passwords do not match!", true);
    return;
  }

  try {
    // --- FIX #3: Correct URL for registration ---
    const res = await fetch('/auth/register', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok) {
      showMessage(registerForm, "Registration successful! Redirecting to login...", false);
      setTimeout(() => {
        // --- FIX #4: Redirect to the login page after successful registration ---
        window.location.href = '/login';
      }, 2000); // Wait 2 seconds before redirecting
    } else {
      showMessage(registerForm, data.message, true);
    }
  } catch (err) {
    console.error("Registration error:", err);
    showMessage(registerForm, "A network error occurred. Please try again.", true);
  }
});