---
sidebar_position: 1
title: Company setup
---

## Sign in for the first time

Before using the OpenATS dashboard, you need an Asgardeo user with the **Super Admin** role.

If you ran `make setup`, use the email address and password you entered during the Asgardeo setup step. The script creates that test user and assigns the Super Admin role when the tenant user store allows automatic provisioning.

If you created the user yourself, sign in with that account instead. In the Asgardeo console, go to **User Management > Users** to create the user, then open **User Management > Roles**, select the OpenATS **Super Admin** role, and assign the user to it. The full application and role configuration is described in the [WSO2 Identity Platform setup guide](../administration/iam-setup).

There are no default OpenATS credentials. OpenATS uses the credentials managed by your Asgardeo tenant.

## Complete the required company setup

After your first successful sign-in, OpenATS sends you to **Settings > General**. This is required setup, not an optional profile page. You cannot continue to the rest of the dashboard until you save the company profile and create at least one department.

The setup gate checks two things:

1. A company profile exists.
2. At least one department belongs to that company.

Only **Settings > General** remains available while either item is missing. This ensures that jobs always have an organization and department to belong to.

### 1. Enter the company profile

In the **Company Profile** section, complete the required fields:

- **Company Name**: the organization name used throughout OpenATS.
- **Contact Email**: a valid email address for company contact and public hiring information.

The following fields are optional, but adding them gives your careers page and job listings more useful information:

- **Website**: include the full URL, such as `https://example.com`.
- **Phone**: the company contact number.
- **Address**: the company or hiring office address.
- **Tagline**: a short description shown on the careers page. It accepts up to 500 characters.
- **Company Logo**: upload a PNG, JPG, WebP, GIF, or SVG file up to 5 MB.

Select **Create** when the profile is new, or **Save** when updating an existing profile. Wait for the success message before moving to departments.

### 2. Add a department

In the **Departments** section, select **Add Department**, enter a department name, and select **Add**. For example:

```text
Engineering
```

Create every department that will own jobs, such as Engineering, Product, Design, Marketing, or People Operations. A department only needs a name. You can edit or delete departments later, but a department assigned to an existing job cannot be deleted until those jobs are reassigned or removed.

Once the company profile and at least one department are saved, the setup gate is cleared. OpenATS will take you to the normal dashboard on the next navigation.

## If you are redirected again

Being sent back to **Settings > General** means one of the required setup checks is still incomplete:

- The company profile was not saved successfully.
- The company name or contact email is missing or invalid.
- No department has been created yet.
- The session is connected to a different database than the one where setup was completed.
