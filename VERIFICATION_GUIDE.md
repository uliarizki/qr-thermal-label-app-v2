# Verification Guide: Batch Generator Performance

Since automated browser testing could not be completed, please perform the following manual verification steps to ensure the Batch Generator can handle large datasets (500+ items).

## Prerequisites
- Ensure the development server is running (`npm run dev`).
- Locate the file `test_data_large.txt` in the project root. This file contains 500 generated records.

## Steps

1.  **Open the Application**
    - Navigate to [http://localhost:5173](http://localhost:5173) in your browser.

2.  **Access Batch Generator**
    - Click on the **Batch Generator** (or "Grosir") button in the main interface.

3.  **Input Large Dataset**
    - Open `test_data_large.txt` in a text editor.
    - Select All (Ctrl+A) and Copy (Ctrl+C).
    - Paste (Ctrl+V) the content into the text area in the Batch Generator modal.
    - **Verify:** The app should not freeze. The "Format Detected" should show **"Excel / Spreadsheet (Tab)"** or **"Auto"**.

4.  **Check Virtualization**
    - Scroll through the table below the input area.
    - **Verify:** Scrolling should be smooth. Rows should render as you scroll (this confirms virtualization is working).

5.  **Generate & Download**
    - Click the **"Generate ZIP"** button.
    - **Verify:**
        - A progress indicator should appear (e.g., "Processing 1/500...").
        - The process should complete within a reasonable time (approx. 10-30 seconds depending on machine).
        - A ZIP file named `Batch_Labels_*.zip` should automatically download.

6.  **Validate Output**
    - Extract the downloaded ZIP file.
    - **Verify:** It should contain 500 PDF files (e.g., `Test_User_1_Jakarta_ID001.pdf`).
    - Open a few random PDFs to ensure the layout is correct and text is legible.

## Troubleshooting
- If the browser crashes, try reducing the dataset to 100 lines.
- If the ZIP generation is too slow, check the console (F12) for any errors.
