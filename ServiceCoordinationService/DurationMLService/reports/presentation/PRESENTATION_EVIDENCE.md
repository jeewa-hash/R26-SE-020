# Ridge model presentation evidence

The model predicts **task duration in minutes**, not delay probability. The coordination engine uses duration + availability + bookings + travel + buffer to decide schedule feasibility.

## Reproducible evaluation

- Dataset: 1556 rows; 334 providers.
- Holdout: 289 rows from 67 providers. Training/test provider overlap: **0**.
- Ridge MAE: **11.95 minutes**; RMSE: **16.71 minutes**; R²: **0.9656**.
- Task-median baseline MAE: **11.29 minutes**; R²: **0.9704**.
- Saved artifact reproduces this fit: **True**.

Show `heldout_evidence.csv` for actual versus predicted durations and per-job errors. Cite the environment and SHA-256 fingerprints in `evaluation_evidence.json`. No deployed model assets were replaced.

## Live demonstration

1. Use a real service category, service type and canonical task. Avoid using an entire post title as a task label.
2. In the provider quotation form, enter relevant experience, task frequency and planned team size. These are provider-declared values, not independently verified facts.
3. Send/recheck the quotation and expand **Duration estimate** in provider Quotation Details.
4. Show the captured input payload, effective inputs, imputed fields, unseen categories, Ridge version and prediction.
5. Show predicted minutes plus buffer and the resulting schedule window. Travel feasibility is a separate deterministic calculation.
6. If the result says reference fallback, do not present it as an ML prediction. Historical quotations without evidence need a new check; evidence is not invented retrospectively.

## Limits to state clearly

R² is not an accuracy percentage. This evaluation does not prove every incoming input is correct, establish field-trial accuracy, or independently verify dataset provenance. Compare the baseline honestly; a higher Ridge error means it did not outperform that baseline. Production monitoring should compare predicted minutes with actual completed-job duration using actual start/end timestamps.
