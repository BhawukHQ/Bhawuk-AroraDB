package api

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/BhawukHQ/Bhawuk-AroraDB/internal/engine"
)

// CreateBackupZip archives all data files starting with engine.DataFilePrefix into a zip writer.
func CreateBackupZip(dbDir string, w io.Writer) error {
	archive := zip.NewWriter(w)
	defer archive.Close()

	files, err := os.ReadDir(dbDir)
	if err != nil {
		return fmt.Errorf("failed to read database directory: %w", err)
	}

	for _, f := range files {
		if !f.IsDir() && strings.HasPrefix(f.Name(), engine.DataFilePrefix) {
			path := filepath.Join(dbDir, f.Name())
			
			fileToZip, err := os.Open(path)
			if err != nil {
				return err
			}
			defer fileToZip.Close()

			info, err := fileToZip.Stat()
			if err != nil {
				return err
			}

			header, err := zip.FileInfoHeader(info)
			if err != nil {
				return err
			}
			header.Name = f.Name()
			header.Method = zip.Deflate

			writer, err := archive.CreateHeader(header)
			if err != nil {
				return err
			}

			_, err = io.Copy(writer, fileToZip)
			if err != nil {
				return err
			}
		}
	}
	return nil
}

// RestoreBackupZip extracts data files from a zip reader, restoring them into the db directory.
func RestoreBackupZip(dbDir string, r io.Reader) error {
	// Create a temporary file to hold the zip data since zip.NewReader needs a ReaderAt
	tmpZip, err := os.CreateTemp("", "aroradb-restore-*.zip")
	if err != nil {
		return fmt.Errorf("failed to create temp zip file: %w", err)
	}
	defer func() {
		_ = tmpZip.Close()
		_ = os.Remove(tmpZip.Name())
	}()

	size, err := io.Copy(tmpZip, r)
	if err != nil {
		return fmt.Errorf("failed to write temp zip data: %w", err)
	}

	archive, err := zip.NewReader(tmpZip, size)
	if err != nil {
		return fmt.Errorf("failed to open zip archive: %w", err)
	}

	// 1. Validate files inside zip first to prevent corruption or path traversal exploits
	for _, f := range archive.File {
		if f.FileInfo().IsDir() {
			continue
		}
		// Security: prevent zip-slip path traversal attacks
		if strings.Contains(f.Name, "..") || filepath.IsAbs(f.Name) {
			return fmt.Errorf("malicious file path detected in zip: %s", f.Name)
		}
		if !strings.HasPrefix(f.Name, engine.DataFilePrefix) {
			return fmt.Errorf("invalid file format in zip: %s", f.Name)
		}
	}

	// 2. Remove existing database files
	files, err := os.ReadDir(dbDir)
	if err == nil {
		for _, f := range files {
			if !f.IsDir() && strings.HasPrefix(f.Name(), engine.DataFilePrefix) {
				_ = os.Remove(filepath.Join(dbDir, f.Name()))
			}
		}
	}

	// 3. Extract files
	for _, f := range archive.File {
		if f.FileInfo().IsDir() {
			continue
		}

		rc, err := f.Open()
		if err != nil {
			return err
		}
		defer rc.Close()

		path := filepath.Join(dbDir, f.Name)
		outFile, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			return err
		}
		defer outFile.Close()

		_, err = io.Copy(outFile, rc)
		if err != nil {
			return err
		}
	}

	return nil
}
