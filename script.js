let allJobs = [];
let currentJobId = null;

const dashboard = document.getElementById("dashboard");
const appPage = document.getElementById("applicationPage");
const jobList = document.getElementById("jobList");

async function loadJobs() {
    try {
        const response = await fetch("http://localhost:3000/jobs");
        allJobs = await response.json();
        renderJobs(allJobs);
    } catch (err) {
        console.error("Connection failed.");
    }
}

function renderJobs(data) {
    jobList.innerHTML = ""; // FIX: Clears the list before rendering
    
    if (data.length === 0) {
        jobList.innerHTML = "<p>No jobs found matching your criteria.</p>";
        return;
    }

    data.forEach(job => {
        jobList.innerHTML += `
            <div class="job-entry">
                <div>
                    <h3 style="margin:0;">${job.title}</h3>
                    <p style="margin:5px 0; color:#888;">${job.company} • ${job.job_type} • ${job.location}</p>
                </div>
                <button class="apply-btn-top" onclick="openApply(${job.id})">View & Apply</button>
            </div>
        `;
    });
}

function openApply(id) {
    const job = allJobs.find(j => j.id === id);
    if(!job) return;
    currentJobId = id;
    
    document.getElementById("displayTitle").innerText = job.title;
    document.getElementById("displayType").innerText = job.job_type;
    document.getElementById("displayLoc").innerText = job.location;
    document.getElementById("displaySalary").innerText = job.salary;
    document.getElementById("displayAbout").innerText = job.about_company;
    document.getElementById("displaySummary").innerText = job.job_summary;
    
    document.getElementById("displayResp").innerHTML = job.responsibilities.split(',').map(r => `<li>${r.trim()}</li>`).join('');
    document.getElementById("displayQual").innerHTML = job.qualifications.split(',').map(q => `<li>${q.trim()}</li>`).join('');

    dashboard.classList.add("hidden");
    appPage.classList.remove("hidden");
    window.scrollTo(0,0);
}

function showDashboard() {
    appPage.classList.add("hidden");
    dashboard.classList.remove("hidden");
}

document.getElementById("applicationForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    
    // PHONE VALIDATION
    const phoneVal = document.getElementById("phone").value;
    if (!/^\d{9,10}$/.test(phoneVal)) {
        alert("Please enter a valid phone number (9-10 digits).");
        return;
    }

    const formData = new FormData();
    formData.append("job_id", currentJobId);
    formData.append("first_name", document.getElementById("fname").value);
    formData.append("last_name", document.getElementById("lname").value);
    formData.append("email", document.getElementById("email").value);
    formData.append("phone", phoneVal);
    formData.append("resume", document.getElementById("resume").files[0]);

    try {
        const response = await fetch("http://localhost:3000/apply", {
            method: "POST",
            body: formData
        });
        
        const msg = await response.text();
        if (response.ok) {
            alert(msg);
            this.reset();
            showDashboard();
        } else {
            alert("Error: " + msg);
        }
    } catch (err) {
        alert("Server error. Check VS Code terminal.");
    }
});

function filter() {
    const search = document.getElementById("searchJob").value.toLowerCase();
    const type = document.getElementById("filterType").value;
    const loc = document.getElementById("filterLocation").value;

    const filtered = allJobs.filter(j => 
        (j.title.toLowerCase().includes(search) || j.company.toLowerCase().includes(search)) &&
        (type === "" || j.job_type === type) &&
        (loc === "" || j.location.includes(loc))
    );
    renderJobs(filtered);
}

document.getElementById("searchJob").addEventListener("input", filter);
document.getElementById("filterType").addEventListener("change", filter);
document.getElementById("filterLocation").addEventListener("change", filter);

loadJobs();