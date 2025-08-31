#!/usr/bin/env python3
"""
Test runner script for COS360 project
Provides convenient ways to run different test suites
"""
import subprocess
import sys
import argparse
from pathlib import Path

def run_command(command):
    """Run a command and return the result"""
    print(f"Running: {' '.join(command)}")
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Command failed with exit code {e.returncode}")
        print(f"STDOUT: {e.stdout}")
        print(f"STDERR: {e.stderr}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Run tests for COS360 project")
    parser.add_argument("--unit", action="store_true", help="Run unit tests only")
    parser.add_argument("--integration", action="store_true", help="Run integration tests only")
    parser.add_argument("--api", action="store_true", help="Run API tests only")
    parser.add_argument("--fee", action="store_true", help="Run fee module tests only")
    parser.add_argument("--coverage", action="store_true", help="Run tests with coverage report")
    parser.add_argument("--html-coverage", action="store_true", help="Generate HTML coverage report")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--failed", action="store_true", help="Run only previously failed tests")
    parser.add_argument("--install-deps", action="store_true", help="Install test dependencies first")
    
    args = parser.parse_args()
    
    # Change to project directory
    project_dir = Path(__file__).parent
    print(f"Running tests from: {project_dir}")
    
    # Install test dependencies if requested
    if args.install_deps:
        print("Installing test dependencies...")
        if not run_command([sys.executable, "-m", "pip", "install", "-r", "requirements-test.txt"]):
            print("Failed to install test dependencies")
            return 1
    
    # Build pytest command
    pytest_cmd = [sys.executable, "-m", "pytest"]
    
    # Add verbosity
    if args.verbose:
        pytest_cmd.append("-v")
    else:
        pytest_cmd.append("-v")  # Always use verbose for better output
    
    # Add specific test selections
    if args.unit:
        pytest_cmd.extend(["-m", "unit"])
    elif args.integration:
        pytest_cmd.extend(["-m", "integration"])
    elif args.api:
        pytest_cmd.extend(["-m", "api"])
    elif args.fee:
        pytest_cmd.extend(["tests/unit/fee/", "tests/integration/fee/"])
    elif args.failed:
        pytest_cmd.append("--lf")
    
    # Add coverage options
    if args.coverage or args.html_coverage:
        pytest_cmd.extend(["--cov=app", "--cov-report=term-missing"])
        
        if args.html_coverage:
            pytest_cmd.append("--cov-report=html")
    
    # Run the tests
    success = run_command(pytest_cmd)
    
    if args.html_coverage and success:
        print("\nHTML coverage report generated at: htmlcov/index.html")
    
    # Summary
    if success:
        print("\n✅ All tests passed!")
        return 0
    else:
        print("\n❌ Some tests failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())