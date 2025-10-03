"""
Migration Service for COS360 Schema Management
Handles schema migrations without modifying existing alembic configuration
"""

from typing import Dict, Optional
import subprocess
import asyncio
import os
import logging

logger = logging.getLogger(__name__)

class MigrationService:

    @staticmethod
    async def migrate_schema_to_head(schema_name: str) -> Dict:
        """
        Migrate schema to head using existing alembic configuration
        Uses SCHEMA_NAME environment variable that works with existing env.py
        """
        try:
            logger.info(f"Migrating schema {schema_name} to head...")

            # Set up environment for alembic
            env = os.environ.copy()
            env['SCHEMA_NAME'] = schema_name

            # Run alembic upgrade head
            process = await asyncio.create_subprocess_exec(
                'alembic', 'upgrade', 'head',
                env=env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=os.getcwd()
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                logger.info(f"Schema {schema_name} migrated successfully to head")
                return {
                    'success': True,
                    'message': f'Schema {schema_name} migrated to head',
                    'output': stdout.decode().strip() if stdout else ''
                }
            else:
                error_msg = stderr.decode() if stderr else 'Unknown error'
                logger.error(f"Migration failed for {schema_name}: {error_msg}")
                return {
                    'success': False,
                    'error': f'Migration failed: {error_msg}',
                    'schema_name': schema_name
                }

        except Exception as e:
            logger.error(f"Migration execution failed for {schema_name}: {str(e)}")
            return {
                'success': False,
                'error': f'Migration execution failed: {str(e)}',
                'schema_name': schema_name
            }

    @staticmethod
    async def get_current_migration_version(schema_name: str) -> Dict:
        """
        Get current migration version for a schema
        """
        try:
            # Set up environment for alembic
            env = os.environ.copy()
            env['SCHEMA_NAME'] = schema_name

            # Run alembic current
            process = await asyncio.create_subprocess_exec(
                'alembic', 'current',
                env=env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=os.getcwd()
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                output = stdout.decode().strip()
                # Extract version from output
                version = output.split('\n')[-1].strip() if output else 'No version'

                return {
                    'success': True,
                    'schema_name': schema_name,
                    'current_version': version,
                    'output': output
                }
            else:
                error_msg = stderr.decode() if stderr else 'Unknown error'
                return {
                    'success': False,
                    'error': f'Failed to get current version: {error_msg}',
                    'schema_name': schema_name
                }

        except Exception as e:
            logger.error(f"Failed to get migration version for {schema_name}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'schema_name': schema_name
            }

    @staticmethod
    async def check_migration_history(schema_name: str) -> Dict:
        """
        Check migration history for a schema
        """
        try:
            # Set up environment for alembic
            env = os.environ.copy()
            env['SCHEMA_NAME'] = schema_name

            # Run alembic history
            process = await asyncio.create_subprocess_exec(
                'alembic', 'history',
                env=env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=os.getcwd()
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                history = stdout.decode().strip()

                return {
                    'success': True,
                    'schema_name': schema_name,
                    'history': history,
                    'has_history': bool(history and 'Rev:' in history)
                }
            else:
                error_msg = stderr.decode() if stderr else 'Unknown error'
                return {
                    'success': False,
                    'error': f'Failed to get migration history: {error_msg}',
                    'schema_name': schema_name
                }

        except Exception as e:
            logger.error(f"Failed to get migration history for {schema_name}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'schema_name': schema_name
            }

    @staticmethod
    async def validate_migration_state(schema_name: str) -> Dict:
        """
        Validate migration state for a schema
        """
        try:
            logger.info(f"Validating migration state for {schema_name}")

            # Get current version
            current_result = await MigrationService.get_current_migration_version(schema_name)

            # Get history
            history_result = await MigrationService.check_migration_history(schema_name)

            validation = {
                'schema_name': schema_name,
                'validation_timestamp': str(asyncio.get_event_loop().time()),
                'migration_state': 'UNKNOWN',
                'current_version': current_result.get('current_version', 'Unknown'),
                'has_migration_history': history_result.get('has_history', False),
                'validation_passed': False,
                'recommendations': []
            }

            # Determine migration state
            if current_result['success'] and history_result['success']:
                if current_result['current_version'] != 'No version':
                    validation['migration_state'] = 'CURRENT'
                    validation['validation_passed'] = True
                else:
                    validation['migration_state'] = 'NEEDS_MIGRATION'
                    validation['recommendations'].append(f'Run migration for {schema_name}')
            else:
                validation['migration_state'] = 'ERROR'
                validation['recommendations'].append('Fix migration system errors')

            logger.info(f"Migration validation completed for {schema_name}: {validation['migration_state']}")
            return validation

        except Exception as e:
            logger.error(f"Migration validation failed for {schema_name}: {str(e)}")
            return {
                'schema_name': schema_name,
                'migration_state': 'ERROR',
                'validation_passed': False,
                'error': str(e)
            }