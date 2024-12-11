# Quick Start Guide for Using This Setup

This guide outlines the steps to quickly set up and use the infrastructure in Visual Studio Code (VSC) for this project. Follow these steps for a seamless experience.

---

## Setup Infrastructure Mode

1. **Navigate to Docker Directory**

   - Open your terminal in VSC and navigate to the Docker directory:
     ```bash
     cd docker
     ```

2. **Start Docker Containers**
   - Use Docker Compose to start the necessary services:
     ```bash
     docker-compose up
     ```

---

## Seeder and Admin Account Setup

1. **Run the Seeder**

   - Use the provided seeder to set up a default admin account.

2. **Admin Credentials**
   - Default username and password are set up by the seeder.
   - You can change the password within the seeder configuration if needed.

---

## User Setup

1. **Create a CV**

   - Use the `user/cv` endpoint to set up a CV for the user.
   - This requires a valid JWT. Ensure you:
     - Login to the application.
     - Retrieve the JWT for authentication.

2. **Base Cover Letter**

   - Combine multiple cover letters to create a generic base.
   - Write the base cover letter in a way that reflects your personal tone and style.

3. **User Talk**
   - Establish your unique writing and speaking style. You can do this by:
     - Completing a typing or speaking test.
     - Providing content samples for GPT to emulate your voice.

---

## Job Type Setup

1. **Endpoint Overview**

   - Use the `jobType` endpoint to define job types. Below is the information you need to include:
     - `name`: The job type name.
     - `location`: The job location.
     - `userId`: The unique user ID.
     - `desiredPay`: The desired pay for the job type.
     - `description`: A brief description of the job type.

2. **Setup Job Type**
   - Ensure all fields (e.g., `name`, `location`, `userId`, `desiredPay`, `description`) are correctly filled and validated.

---

## Final Steps

1. **Start the Worker**

   - Ensure the worker is up and running to process tasks.

2. **Verify Functionality**
   - Test the endpoints and features to confirm the setup is functioning correctly.

---

You’re all set! If you encounter any issues, revisit the steps or consult additional documentation for troubleshooting.

[![](https://mermaid.ink/img/pako:eNpFkN1qwzAMhV9F6Lpl92EMuqWwXZRlTcZgcS_URktCazv4Z6w0ffcpTbIZZJ8jPsmyL3iwFWOCtaOugSJVBmS9e3blsMEdrH8CO0MnyM8-sN7B_XL5AKvspZTYjXxmfagd-3IWkD7-gyMjAiTRr7_ZhB62tN-3YfNWzmJqNdsb-2SNj1raTUUf1h1lsvGYCkZzw5-LIoPsNS_64TZcoGanqa3kfZcBVhga1qwwEVmROypU5iocxWDzszlgElzkBTob6waTLzp5cbGrKHDaknyS_st2ZD6tnf31F2m2bAg?type=png)](https://mermaid.live/edit#pako:eNpFkN1qwzAMhV9F6Lpl92EMuqWwXZRlTcZgcS_URktCazv4Z6w0ffcpTbIZZJ8jPsmyL3iwFWOCtaOugSJVBmS9e3blsMEdrH8CO0MnyM8-sN7B_XL5AKvspZTYjXxmfagd-3IWkD7-gyMjAiTRr7_ZhB62tN-3YfNWzmJqNdsb-2SNj1raTUUf1h1lsvGYCkZzw5-LIoPsNS_64TZcoGanqa3kfZcBVhga1qwwEVmROypU5iocxWDzszlgElzkBTob6waTLzp5cbGrKHDaknyS_st2ZD6tnf31F2m2bAg)
