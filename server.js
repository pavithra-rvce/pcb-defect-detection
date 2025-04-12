const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Real YOLO model detection using Python bridge
function runYoloModel(imagePath) {
  return new Promise((resolve, reject) => {
    // Call your Python script with the image path as an argument
    exec(`python detect_pcb_defects.py "${imagePath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Execution error: ${error}`);
        return reject(error);
      }
      
      if (stderr) {
        console.error(`Python stderr: ${stderr}`);
      }
      
      try {
        // Parse the JSON output from Python
        const results = JSON.parse(stdout);
        resolve(results);
      } catch (err) {
        console.error('Error parsing Python output:', err);
        console.error('Raw output:', stdout);
        reject(err);
      }
    });
  });
}

// Endpoint to analyze PCB image
app.post('/api/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }
    
    // Get the path of the uploaded image
    const imagePath = req.file.path;
    
    console.log(`Processing image: ${imagePath}`);
    
    // Process the image with your YOLO model
    const results = await runYoloModel(imagePath);
    
    // Return results to client
    res.json(results);
    
    // Optionally, clean up the uploaded file after processing
    // fs.unlinkSync(imagePath);
    
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ 
      error: 'Failed to process image', 
      message: error.message,
      defects: [],
      analysis: "Failed to analyze the PCB image due to a server error."
    });
  }
});

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Make sure to place your best.pt model file in the same directory as detect_pcb_defects.py`);
});
