"""Add unified inventory check system

Revision ID: a1b2c3d4e5f6
Revises: f8d2a3c9e7b1
Create Date: 2026-01-31 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f8d2a3c9e7b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create inventory_checks table
    op.create_table('inventory_checks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('check_number', sa.String(length=20), nullable=False),
        sa.Column('contractor_id', sa.Integer(), nullable=False),
        sa.Column('check_type', sa.String(length=20), nullable=False),  # 'audit' | 'self_report'
        sa.Column('is_blind', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='draft'),  # draft | counting | review | resolved
        sa.Column('initiated_by', sa.String(length=100), nullable=True),
        sa.Column('counted_by', sa.String(length=100), nullable=True),
        sa.Column('reviewed_by', sa.String(length=100), nullable=True),
        sa.Column('check_date', sa.Date(), nullable=False),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['contractor_id'], ['contractors.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('check_number')
    )
    op.create_index(op.f('ix_inventory_checks_id'), 'inventory_checks', ['id'], unique=False)
    op.create_index('ix_inventory_checks_contractor_status', 'inventory_checks', ['contractor_id', 'status'], unique=False)
    op.create_index('ix_inventory_checks_check_date', 'inventory_checks', ['check_date'], unique=False)

    # Create inventory_check_lines table
    op.create_table('inventory_check_lines',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('check_id', sa.Integer(), nullable=False),
        sa.Column('material_id', sa.Integer(), nullable=False),
        sa.Column('expected_quantity', sa.Numeric(precision=15, scale=3), nullable=False),
        sa.Column('actual_quantity', sa.Numeric(precision=15, scale=3), nullable=True),
        sa.Column('variance', sa.Numeric(precision=15, scale=3), nullable=True),
        sa.Column('variance_percent', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('resolution', sa.String(length=20), nullable=True),  # 'accept' | 'keep_system' | 'investigate'
        sa.Column('adjustment_quantity', sa.Numeric(precision=15, scale=3), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['check_id'], ['inventory_checks.id']),
        sa.ForeignKeyConstraint(['material_id'], ['materials.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_inventory_check_lines_id'), 'inventory_check_lines', ['id'], unique=False)
    op.create_index('ix_inventory_check_lines_check_id', 'inventory_check_lines', ['check_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_inventory_check_lines_check_id', table_name='inventory_check_lines')
    op.drop_index(op.f('ix_inventory_check_lines_id'), table_name='inventory_check_lines')
    op.drop_table('inventory_check_lines')

    op.drop_index('ix_inventory_checks_check_date', table_name='inventory_checks')
    op.drop_index('ix_inventory_checks_contractor_status', table_name='inventory_checks')
    op.drop_index(op.f('ix_inventory_checks_id'), table_name='inventory_checks')
    op.drop_table('inventory_checks')
