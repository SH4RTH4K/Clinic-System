<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number', 50)->unique();
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->foreignId('visit_id')->nullable()->constrained('visits')->nullOnDelete();
            $table->decimal('subtotal', 10, 2)->default(0.00);
            $table->decimal('discount_amount', 10, 2)->default(0.00);
            $table->enum('discount_type', ['fixed', 'percentage'])->default('fixed');
            $table->decimal('tax_amount', 10, 2)->default(0.00);
            $table->decimal('total_amount', 10, 2)->default(0.00);
            $table->decimal('paid_amount', 10, 2)->default(0.00);
            $table->decimal('due_amount', 10, 2)->default(0.00);
            $table->enum('status', ['unpaid', 'partially_paid', 'paid', 'cancelled', 'waived'])->default('unpaid');
            $table->date('invoice_date');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['patient_id', 'status']);
            $table->index('visit_id');
            $table->index('invoice_date');
            $table->index('status');
        });

        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->enum('item_type', ['consultation', 'medicine', 'investigation', 'procedure', 'other'])->default('other');
            $table->string('item_name', 255);
            $table->decimal('quantity', 8, 2)->default(1.00);
            $table->decimal('unit_price', 10, 2)->default(0.00);
            $table->decimal('total_price', 10, 2)->default(0.00);
            $table->foreignId('medicine_batch_id')->nullable()->constrained('medicine_batches')->nullOnDelete();
            $table->string('notes', 255)->nullable();
            $table->timestamps();

            $table->index('invoice_id');
            $table->index('item_type');
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->string('payment_number', 50)->unique();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->enum('payment_method', ['cash', 'bkash', 'nagad', 'rocket', 'card', 'bank', 'other'])->default('cash');
            $table->decimal('amount', 10, 2);
            $table->string('transaction_reference', 100)->nullable();
            $table->date('payment_date');
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('invoice_id');
            $table->index(['payment_method', 'payment_date']);
        });

        Schema::table('clinic_settings', function (Blueprint $table) {
            $table->decimal('default_consultation_fee', 10, 2)->default(500.00)->after('auto_deduct_inventory');
            $table->text('invoice_footer_note')->nullable()->after('default_consultation_fee');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clinic_settings', function (Blueprint $table) {
            $table->dropColumn(['default_consultation_fee', 'invoice_footer_note']);
        });

        Schema::dropIfExists('payments');
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
    }
};
