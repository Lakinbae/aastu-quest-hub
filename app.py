import os
import random
import requests
from flask import Flask, redirect, render_template, request, session, url_for
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = "aastu_secret_quest_key_change_this"

# Configure Supabase
SUPABASE_URL = https://njldbryvwtfawzvklhcn.supabase.co"
SUPABASE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qbGRicnl2d3RmYXd6dmtsaGNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0ODk2NjMsImV4cCI6MjEwMjA2NTY2M30.1QOcknzZCRBg-sYc9mbH95zCsB3CfIPFwkqPXJTh-MY"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

UPLOAD_FOLDER = "static/uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

MISSIONS_POOL = [
    "Find your partner, debate whether Python or C++ is superior for 1 minute, and fist-bump.",
    "Locate your partner on campus, ask what their favorite debugging nightmare was, and swap an inside joke.",
    "Find your partner and take a quick selfie holding up your student IDs together.",
    "Collaborate for 2 minutes to brainstorm a terrible startup idea, then write it down on a scrap paper.",
    "Find your partner, ask for their section, and teach them a quick word in your native language.",
    "Take a photo with your partner while posing like computer science professors teaching recursion.",
]


def supabase_request(endpoint, method="GET", data=None):
  url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
  try:
    if method == "GET":
      res = requests.get(url, headers=HEADERS)
    elif method == "POST":
      res = requests.post(url, headers=HEADERS, json=data)
    elif method == "PATCH":
      res = requests.patch(url, headers=HEADERS, json=data)
    return res.json() if res.text else []
  except Exception as e:
    print(f"Supabase Error: {e}")
    return None


@app.route("/", methods=["GET", "POST"])
def login():
  error = None
  if request.method == "POST":
    student_id = request.form.get("student_id").strip().upper()

    # Query Supabase for student
    res = supabase_request(
        f"students?student_id=eq.{urllib_quote(student_id)}&select=*"
    )
    # Simple workaround for string query
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/students?student_id=eq.{student_id}",
        headers=HEADERS,
    ).json()

    if res:
      session["student"] = res[0]
      return redirect(url_for("dashboard"))
    else:
      error = "Student ID not found in roster. Check spelling!"

  return render_template("index.html", error=error)


def urllib_quote(s):
  import urllib.parse

  return urllib.parse.quote(s)


@app.route("/dashboard", methods=["GET", "POST"])
def dashboard():
  if "student" not in session:
    return redirect(url_for("login"))

  student = session["student"]

  # Refresh student data from DB
  res = requests.get(
      f"{SUPABASE_URL}/rest/v1/students?id=eq.{student['id']}", headers=HEADERS
  ).json()
  if res:
    student = res[0]
    session["student"] = student

  # Handle Telebirr Phone Update
  if request.method == "POST" and "update_phone" in request.form:
    phone = request.form.get("phone").strip()
    requests.patch(
        f"{SUPABASE_URL}/rest/v1/students?id=eq.{student['id']}",
        headers=HEADERS,
        json={"telebirr_phone": phone},
    )
    return redirect(url_for("dashboard"))

  # Handle Quest Request
  if request.method == "POST" and "get_quest" in request.form:
    # Check if active pending mission exists
    active = requests.get(
        f"{SUPABASE_URL}/rest/v1/missions?user_id=eq.{student['id']}&status=in.(PENDING,SUBMITTED)",
        headers=HEADERS,
    ).json()

    if not active:
      # Find available partner from a DIFFERENT section
      all_students = requests.get(
          f"{SUPABASE_URL}/rest/v1/students?id=neq.{student['id']}",
          headers=HEADERS,
      ).json()
      other_section_peers = [
          s for s in all_students if s["section"] != student["section"]
      ]

      if other_section_peers:
        partner = random.choice(other_section_peers)
        mission_text = random.choice(MISSIONS_POOL)
        payload = {
            "user_id": student["id"],
            "partner_id": partner["id"],
            "mission_text": mission_text,
            "status": "PENDING",
            "reward_amount": 5.00,
        }
        requests.post(
            f"{SUPABASE_URL}/rest/v1/missions", headers=HEADERS, json=payload
        )

    return redirect(url_for("dashboard"))

  # Handle Proof Upload
  if request.method == "POST" and "upload_proof" in request.form:
    mission_id = request.form.get("mission_id")
    file = request.files.get("proof_image")

    if file and mission_id:
      filename = secure_filename(f"mission_{mission_id}_{file.filename}")
      filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
      file.save(filepath)

      requests.patch(
          f"{SUPABASE_URL}/rest/v1/missions?id=eq.{mission_id}",
          headers=HEADERS,
          json={"status": "SUBMITTED", "proof_image_url": f"/{filepath}"},
      )
    return redirect(url_for("dashboard"))

  # Fetch active missions for user
  missions = requests.get(
      f"{SUPABASE_URL}/rest/v1/missions?user_id=eq.{student['id']}&order=id.desc",
      headers=HEADERS,
  ).json()

  # Fetch partner names for missions
  for m in missions:
    p_res = requests.get(
        f"{SUPABASE_URL}/rest/v1/students?id=eq.{m['partner_id']}",
        headers=HEADERS,
    ).json()
    m["partner"] = p_res[0] if p_res else {"name": "Unknown", "section": "?"}

  return render_template("dashboard.html", student=student, missions=missions)


@app.route("/leaderboard")
def leaderboard():
  students = requests.get(
      f"{SUPABASE_URL}/rest/v1/students?order=total_earned.desc&limit=10",
      headers=HEADERS,
  ).json()

  # Calculate Section Wars totals
  all_s = requests.get(
      f"{SUPABASE_URL}/rest/v1/students?select=section,total_earned",
      headers=HEADERS,
  ).json()
  sections = {"A": 0, "B": 0, "C": 0, "D": 0}
  for s in all_s:
    sec = s.get("section")
    if sec in sections:
      sections[sec] += float(s.get("total_earned", 0))

  return render_template(
      "leaderboard.html", top_students=students, sections=sections
  )


@app.route("/admin", methods=["GET", "POST"])
def admin():
  # Simple admin panel to review submitted proofs and trigger Telebirr payouts
  if request.method == "POST":
    mission_id = request.form.get("mission_id")
    action = request.form.get("action")  # APPROVE or REJECT

    if action == "APPROVE":
      # Get mission to find user and reward amount
      m_res = requests.get(
          f"{SUPABASE_URL}/rest/v1/missions?id=eq.{mission_id}", headers=HEADERS
      ).json()
      if m_res:
        mission = m_res[0]
        user_id = mission["user_id"]
        reward = float(mission["reward_amount"])

        # Update mission status
        requests.patch(
            f"{SUPABASE_URL}/rest/v1/missions?id=eq.{mission_id}",
            headers=HEADERS,
            json={"status": "APPROVED"},
        )

        # Add earnings to student total
        u_res = requests.get(
            f"{SUPABASE_URL}/rest/v1/students?id=eq.{user_id}", headers=HEADERS
        ).json()
        if u_res:
            current_earned = float(u_res[0].get("total_earned", 0))
            new_total = current_earned + reward
            requests.patch(
                f"{SUPABASE_URL}/rest/v1/students?id=eq.{user_id}",
                headers=HEADERS,
                json={"total_earned": new_total},
            )
    elif action == "REJECT":
      requests.patch(
          f"{SUPABASE_URL}/rest/v1/missions?id=eq.{mission_id}",
          headers=HEADERS,
          json={"status": "REJECTED"},
      )

    return redirect(url_for("admin"))

  # Fetch pending submissions
  submitted = requests.get(
      f"{SUPABASE_URL}/rest/v1/missions?status=eq.SUBMITTED", headers=HEADERS
  ).json()
  for m in submitted:
    u_res = requests.get(
        f"{SUPABASE_URL}/rest/v1/students?id=eq.{m['user_id']}", headers=HEADERS
    ).json()
    p_res = requests.get(
        f"{SUPABASE_URL}/rest/v1/students?id=eq.{m['partner_id']}",
        headers=HEADERS,
    ).json()
    m["student"] = u_res[0] if u_res else {}
    m["partner"] = p_res[0] if p_res else {}

  return render_template("admin.html", submitted=submitted)


@app.route("/logout")
def logout():
  session.clear()
  return redirect(url_for("login"))


if __name__ == "__main__":
  app.run(debug=True, port=5000)
