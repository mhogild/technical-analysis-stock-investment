import pytest
from services.search_service import SearchService


@pytest.fixture
def service():
    return SearchService()


class TestSearch:
    def test_returns_list(self, service):
        results = service.search("AAPL")
        assert isinstance(results, list)

    def test_results_have_required_fields(self, service):
        results = service.search("AAPL")
        if results:
            result = results[0]
            assert "symbol" in result or hasattr(result, "symbol")

    def test_empty_query_returns_empty(self, service):
        results = service.search("")
        assert results == [] or len(results) == 0

    def test_max_results(self, service):
        results = service.search("A")
        assert len(results) <= 20
