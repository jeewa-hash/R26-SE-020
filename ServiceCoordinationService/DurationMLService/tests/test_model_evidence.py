import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src import app as api
from src.train_duration_model import FEATURES

class ModelEvidenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls): api.load_assets()

    def test_six_features_exclude_manual_duration(self):
        self.assertEqual(len(FEATURES), 6)
        self.assertNotIn('provider_estimated_duration_mins', FEATURES)
        self.assertEqual(list(api.model.feature_names_in_), FEATURES)

    def test_input_output_snapshot_identifies_missing_values(self):
        result = api.predict_duration(api.DurationPredictionRequest(serviceCategory='Repairing',serviceType='Electrical Repair',taskName='Install Ceiling Fan',plannedTeamSize=2))
        self.assertEqual(result['source'],'TRAINED_DURATION_MODEL')
        self.assertEqual(result['evidence']['submittedInputs']['planned_team_size'],2)
        self.assertEqual(set(result['evidence']['imputedFields']),{'years_experience','task_frequency_per_month'})
        self.assertIsNotNone(result['evidence']['effectiveInputs']['years_experience'])
        self.assertEqual(result['evidence']['unseenCategories'],[])
        self.assertGreater(result['predictedDurationMins'],0)

    def test_unfamiliar_task_is_flagged(self):
        result=api.predict_duration(api.DurationPredictionRequest(serviceCategory='Repairing',serviceType='Electrical Repair',taskName='A free text post title, not a canonical task',yearsExperience=5,taskFrequencyPerMonth=8,plannedTeamSize=1))
        self.assertIn('task_name',result['evidence']['unseenCategories'])
        self.assertEqual(result['evidence']['imputedFields'],[])

    def test_task_catalog_contains_the_three_categorical_inputs_only(self):
        self.assertGreater(len(api.task_catalog),100)
        self.assertEqual(set(api.task_catalog[0]),{'service_category','service_type','task_name'})

if __name__=='__main__':unittest.main()
