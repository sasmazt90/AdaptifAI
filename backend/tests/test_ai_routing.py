import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import (
    TextBlock,
    analyze_localize_v212_ocr_translations,
    build_resize_aspect_family_outpaint_renderer,
    build_smart_reframe_analysis,
    inpaint_localize_v2_base,
)
from app.smart_reframe import BackgroundStyle, BackgroundType, VisualAnalysis


def visual_analysis() -> VisualAnalysis:
    return VisualAnalysis(
        source_width=1200,
        source_height=800,
        background=BackgroundStyle(type=BackgroundType.PHOTOGRAPHIC, texture_complexity=0.4),
    )


class LocalizationRoutingTests(unittest.TestCase):
    def test_terra_qa_failure_escalates_to_sol(self):
        block = TextBlock(
            id="v5-block-1",
            text="Fresh skin!",
            role="headline",
            translate=True,
            bbox=(0, 0, 200, 80),
            clean_box=(0, 0, 200, 80),
            source_word_styles=[
                {"id": "w1", "text": "Fresh", "semanticRole": "benefit"},
                {"id": "w2", "text": "skin!", "semanticRole": "benefit"},
            ],
        )
        calls = []

        def fake_completion(*, model, system_prompt, payload, timeout):
            calls.append(model)
            if model == "gpt-5.6-luna":
                qa_number = calls.count("gpt-5.6-luna")
                return {"passed": qa_number > 1, "risk_level": "low" if qa_number > 1 else "high", "issues": [] if qa_number > 1 else [{"id": block.id, "reason": "literal_copy"}]}
            text = "Taze bir cilt!" if model == "gpt-5.6-terra" else "Taptaze cilt!"
            return {
                "blocks": [
                    {
                        "id": block.id,
                        "translate": True,
                        "translated_text": text,
                        "lines": [{"segments": [{"text": text, "source_word_ids": ["w1", "w2"]}]}],
                    }
                ]
            }

        env = {
            "OPENAI_API_KEY": "test-key-not-used",
            "OPENAI_TRANSLATION_MODEL": "gpt-5.6-terra",
            "ADAPTIFAI_LOCALIZE_QA_MODEL": "gpt-5.6-luna",
            "ADAPTIFAI_LOCALIZE_ESCALATION_MODEL": "gpt-5.6-sol",
        }
        with patch.dict(os.environ, env, clear=False), patch("app.main.openai_json_completion", side_effect=fake_completion):
            payload = analyze_localize_v212_ocr_translations([block], "TR")

        self.assertEqual(payload["analysis_provider"], "openai-sol-v5-polygon-nm-style-escalation")
        self.assertEqual(calls, ["gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.6-sol", "gpt-5.6-luna"])

    def test_v5_lama_failure_reaches_gpt_image_fallback(self):
        source = Image.new("RGB", (64, 64), "white")
        mask = Image.new("L", (64, 64), 255)
        block = TextBlock(id="v5-block-1", text="Copy", role="headline", translate=True, bbox=(0, 0, 64, 64), clean_box=(0, 0, 64, 64))
        provider_result = Image.new("RGB", (64, 64), "blue")
        with (
            patch("app.main.run_replicate_lama_inpaint", return_value=None),
            patch("app.main.run_openai_localize_v2_cleanup", return_value=provider_result),
            patch("app.main.scrub_provider_residuals_inside_mask", side_effect=lambda result, *_: result),
            patch("app.main.polish_masked_cleanup_with_opencv", side_effect=lambda result, *_: result),
        ):
            result, meta = inpaint_localize_v2_base(source, mask, [block])

        self.assertEqual(result.size, source.size)
        self.assertEqual(meta["provider"], "openai")
        self.assertEqual(meta["localizationFallback"], "replicate-lama-to-gpt-image-2")


class ResizeRoutingTests(unittest.TestCase):
    def test_auto_analysis_uses_terra_after_vertex_failure(self):
        source = Image.new("RGB", (1200, 800), "white")
        expected = visual_analysis()
        with (
            patch.dict(os.environ, {"ADAPTIFAI_SMART_REFRAME_ANALYSIS_PROVIDER": "auto"}, clear=False),
            patch("app.main.build_gemini_smart_reframe_analysis", return_value=None),
            patch("app.main.build_openai_smart_reframe_analysis", return_value=expected),
            patch("app.main.build_openrouter_smart_reframe_analysis") as openrouter,
        ):
            result = build_smart_reframe_analysis(source)

        self.assertIs(result, expected)
        openrouter.assert_not_called()

    def test_aspect_family_master_is_generated_once_per_family(self):
        source = Image.new("RGB", (1200, 800), "white")
        generated = []

        def fake_outpaint(_source, width, height, _plan, _analysis):
            generated.append((width, height))
            return Image.new("RGB", (width, height), "green"), {"provider": "test"}

        with patch("app.main.render_clean_base_outpaint_for_compositor", side_effect=fake_outpaint):
            renderer = build_resize_aspect_family_outpaint_renderer()
            first, first_meta = renderer(source, 1080, 1920, object(), visual_analysis())
            second, second_meta = renderer(source, 900, 1600, object(), visual_analysis())
            square, _square_meta = renderer(source, 1200, 1200, object(), visual_analysis())

        self.assertEqual(len(generated), 2)
        self.assertEqual(first.size, (1080, 1920))
        self.assertEqual(second.size, (900, 1600))
        self.assertEqual(square.size, (1200, 1200))
        self.assertEqual(first_meta["aspectFamilyMasterCache"], "miss-generated-master")
        self.assertEqual(second_meta["aspectFamilyMasterCache"], "hit-reused-master")


if __name__ == "__main__":
    unittest.main()
